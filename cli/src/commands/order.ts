import { Command } from "commander";
import inquirer from "inquirer";
import { get, post } from "../api.js";
import * as ui from "../ui.js";

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

interface Order {
  id: string;
  status: string;
  currency: string;
  totalCents: number;
  notes?: string;
  customer?: { id: string; name: string; email?: string } | null;
  items: OrderItem[];
  invoice?: { id: string; status: string; pdfUrl?: string } | null;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  createdAt: string;
}

export function registerOrderCommand(program: Command): void {
  const order = program
    .command("order")
    .description("Manage orders (Business plan and above)");

  // ── order new ─────────────────────────────────────────────────────

  order
    .command("new")
    .description("Create a new order")
    .option("--customer <id>", "Customer ID")
    .option("--currency <code>", "Currency (USD, EUR, GBP, AED)", "USD")
    .option("--notes <text>", "Order notes")
    .action(async (opts) => {
      const items: Array<{ description: string; quantity: number; unitPriceCents: number }> = [];

      ui.heading("New Order");

      // Collect line items
      let addMore = true;
      while (addMore) {
        const item = await inquirer.prompt([
          {
            type: "input",
            name: "description",
            message: "Item description:",
            validate: (input: string) =>
              input.trim() ? true : "Description is required.",
          },
          {
            type: "number",
            name: "quantity",
            message: "Quantity:",
            default: 1,
          },
          {
            type: "number",
            name: "unitPrice",
            message: "Unit price (e.g. 99.99):",
            validate: (input: number) =>
              input > 0 ? true : "Price must be greater than 0.",
          },
        ]);

        items.push({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: Math.round(item.unitPrice * 100),
        });

        const { more } = await inquirer.prompt([
          {
            type: "confirm",
            name: "more",
            message: "Add another item?",
            default: false,
          },
        ]);
        addMore = more;
      }

      // Show summary
      ui.blank();
      ui.line(`  ${ui.BOLD("Order Summary:")}`);
      let total = 0;
      for (const item of items) {
        const lineTotal = item.unitPriceCents * item.quantity;
        total += lineTotal;
        ui.line(`    ${item.description} x${item.quantity}  ${ui.formatCurrency(lineTotal, opts.currency)}`);
      }
      ui.divider();
      ui.line(`  ${ui.BOLD("Total:")} ${ui.BOLD(ui.formatCurrency(total, opts.currency))}`);
      ui.blank();

      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "Create this order?",
          default: true,
        },
      ]);

      if (!confirm) {
        ui.info("Order cancelled.");
        return;
      }

      const s = ui.spinner("Creating order...");
      const res = await post<{ order: Order }>("/api/v1/orders", {
        customerId: opts.customer,
        currency: opts.currency,
        notes: opts.notes,
        items,
      });
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const o = res.data.order;
      ui.success(`Order created: ${ui.BOLD(o.id)}`);
      ui.line(`  Total: ${ui.BOLD(ui.formatCurrency(o.totalCents, o.currency))}`);
      ui.line(`  Items: ${o.items.length}`);
      ui.blank();
    });

  // ── order list ────────────────────────────────────────────────────

  order
    .command("list")
    .description("List orders")
    .option("--format <fmt>", "Output format: table, json, minimal", "table")
    .action(async (opts) => {
      const s = ui.spinner("Loading orders...");
      const res = await get<{ orders: Order[] }>("/api/v1/orders");
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const orders = res.data.orders;

      if (opts.format === "json") {
        ui.jsonOutput(orders);
        return;
      }

      if (opts.format === "minimal") {
        ui.minimalOutput(
          orders.map((o) => [
            o.id,
            o.customer?.name || "-",
            o.status,
            ui.formatCurrency(o.totalCents, o.currency),
            ui.formatDate(o.createdAt),
          ])
        );
        return;
      }

      ui.heading(`Orders (${orders.length})`);
      ui.table(
        [
          { key: "id", label: "ID", width: 10 },
          {
            key: "customer",
            label: "Customer",
            width: 18,
            format: (v) => {
              const c = v as Order["customer"];
              return c?.name || ui.MUTED("-");
            },
          },
          { key: "status", label: "Status", width: 12, format: (v) => ui.statusBadge(v as string) },
          {
            key: "totalCents",
            label: "Total",
            width: 12,
            align: "right" as const,
            format: (_v, _row?: unknown) => {
              // Access currency from the row context - handled via closure
              return ui.MUTED("--");
            },
          },
          { key: "items", label: "Items", width: 6, format: (v) => {
            const items = v as OrderItem[];
            return String(items?.length || 0);
          }},
          { key: "createdAt", label: "Created", width: 10, format: (v) => ui.formatDate(v as string) },
        ],
        orders.map((o) => ({
          ...o,
          totalCents: ui.formatCurrency(o.totalCents, o.currency),
        }))
      );
      ui.blank();
    });

  // ── order invoice ─────────────────────────────────────────────────

  order
    .command("invoice <orderId>")
    .description("Generate or view invoice for an order")
    .action(async (orderId: string) => {
      const s = ui.spinner("Loading invoice...");
      const res = await post<{
        invoice: {
          id: string;
          status: string;
          pdfUrl?: string;
          totalCents: number;
          currency: string;
        };
      }>(`/api/v1/orders/${orderId}/invoice`, {});
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const inv = res.data.invoice;
      ui.heading("Invoice");
      ui.line(`  ${ui.BOLD("ID:")}       ${inv.id}`);
      ui.line(`  ${ui.BOLD("Status:")}   ${ui.statusBadge(inv.status)}`);
      ui.line(`  ${ui.BOLD("Total:")}    ${ui.formatCurrency(inv.totalCents, inv.currency)}`);
      if (inv.pdfUrl) {
        ui.line(`  ${ui.BOLD("PDF:")}      ${inv.pdfUrl}`);
      }
      ui.blank();
    });
}

export function registerCustomerCommand(program: Command): void {
  const customer = program
    .command("customer")
    .description("Manage customers (Business plan and above)");

  // ── customer list ─────────────────────────────────────────────────

  customer
    .command("list")
    .description("List customers")
    .option("--format <fmt>", "Output format: table, json, minimal", "table")
    .action(async (opts) => {
      const s = ui.spinner("Loading customers...");
      const res = await get<{ customers: Customer[] }>("/api/v1/orders/customers");
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const customers = res.data.customers;

      if (opts.format === "json") {
        ui.jsonOutput(customers);
        return;
      }

      ui.heading(`Customers (${customers.length})`);
      ui.table(
        [
          { key: "id", label: "ID", width: 10 },
          { key: "name", label: "Name", width: 20 },
          { key: "email", label: "Email", width: 25 },
          { key: "company", label: "Company", width: 18 },
          { key: "createdAt", label: "Added", width: 10, format: (v) => ui.formatDate(v as string) },
        ],
        customers
      );
      ui.blank();
    });

  // ── customer add ──────────────────────────────────────────────────

  customer
    .command("add [name]")
    .description("Add a new customer")
    .option("--email <email>", "Customer email")
    .option("--phone <phone>", "Customer phone")
    .option("--company <company>", "Company name")
    .action(async (nameArg: string | undefined, opts) => {
      let name = nameArg;

      if (!name) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "name",
            message: "Customer name:",
            validate: (input: string) =>
              input.trim() ? true : "Name is required.",
          },
          {
            type: "input",
            name: "email",
            message: "Email (optional):",
          },
          {
            type: "input",
            name: "phone",
            message: "Phone (optional):",
          },
          {
            type: "input",
            name: "company",
            message: "Company (optional):",
          },
        ]);
        name = answers.name;
        opts.email = answers.email || opts.email;
        opts.phone = answers.phone || opts.phone;
        opts.company = answers.company || opts.company;
      }

      const s = ui.spinner("Adding customer...");
      const res = await post<{ customer: Customer }>("/api/v1/orders/customers", {
        name,
        email: opts.email,
        phone: opts.phone,
        company: opts.company,
      });
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const c = res.data.customer;
      ui.success(`Customer added: ${ui.BOLD(c.name)}`);
      ui.line(`  ID: ${ui.MUTED(c.id)}`);
      ui.blank();
    });
}
