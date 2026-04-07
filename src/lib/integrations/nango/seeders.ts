import { prisma } from "@/lib/prisma";
import { getNangoClient } from "./client";

// ---------------------------------------------------------------------------
// Shared upsert helper
// ---------------------------------------------------------------------------

interface ContextEntrySeedInput {
  entryType: "PREFERENCE" | "INSIGHT" | "ENTITY";
  category: string;
  key: string;
  value: Record<string, unknown>;
}

async function upsertContextEntry(
  orgId: string,
  entry: ContextEntrySeedInput
): Promise<void> {
  await prisma.contextEntry.upsert({
    where: {
      organizationId_category_key: {
        organizationId: orgId,
        category: entry.category,
        key: entry.key,
      },
    },
    create: {
      organizationId: orgId,
      entryType: entry.entryType,
      category: entry.category,
      key: entry.key,
      value: entry.value as unknown as import("@prisma/client").Prisma.InputJsonValue,
      confidence: 0.8,
    },
    update: {
      value: entry.value as unknown as import("@prisma/client").Prisma.InputJsonValue,
      confidence: 0.8,
    },
  });
}

// ---------------------------------------------------------------------------
// Google Drive seeder
// ---------------------------------------------------------------------------

export async function seedGoogleDriveContext(
  connectionId: string,
  orgId: string
): Promise<void> {
  const nango = getNangoClient();

  try {
    const response = await nango.proxy({
      method: "GET",
      endpoint: "/drive/v3/files",
      connectionId,
      providerConfigKey: "google_drive",
      params: {
        q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
        fields: "files(id,name,createdTime)",
        pageSize: "20",
        orderBy: "modifiedTime desc",
      },
    });

    const data = response.data as { files?: Array<{ id: string; name: string; createdTime: string }> };
    const files = data?.files ?? [];

    for (const folder of files) {
      await upsertContextEntry(orgId, {
        entryType: "ENTITY",
        category: "google_drive_folder",
        key: `gdrive_folder_${folder.id}`,
        value: {
          name: folder.name,
          folderId: folder.id,
          source: "google_drive",
          potentialClient: true,
          createdAt: folder.createdTime,
        },
      });
    }

    await upsertContextEntry(orgId, {
      entryType: "PREFERENCE",
      category: "integration_status",
      key: "google_drive_seeded",
      value: {
        seededAt: new Date().toISOString(),
        folderCount: files.length,
        provider: "google_drive",
      },
    });

    console.log(
      `[seeders] Google Drive seeded ${files.length} folders for org ${orgId}`
    );
  } catch (err) {
    console.error(
      `[seeders] Google Drive seeding failed for org ${orgId}:`,
      err
    );
  }
}

// ---------------------------------------------------------------------------
// Slack seeder
// ---------------------------------------------------------------------------

export async function seedSlackContext(
  connectionId: string,
  orgId: string
): Promise<void> {
  const nango = getNangoClient();

  try {
    const channelsResp = await nango.proxy({
      method: "GET",
      endpoint: "/api/conversations.list",
      connectionId,
      providerConfigKey: "slack",
      params: {
        types: "public_channel",
        limit: "50",
        exclude_archived: "true",
      },
    });

    const data = channelsResp.data as {
      channels?: Array<{ id: string; name: string; num_members: number }>;
    };
    const channels = data?.channels ?? [];

    let clientChannels = 0;
    let projectChannels = 0;
    let teamChannels = 0;

    for (const channel of channels) {
      const name = channel.name.toLowerCase();

      let inferredType: "client" | "project" | "team" | "general" = "general";
      let potentialName: string | null = null;

      if (name.startsWith("client-") || name.startsWith("acct-")) {
        inferredType = "client";
        potentialName = channel.name
          .replace(/^(client-|acct-)/, "")
          .replace(/-/g, " ");
        clientChannels++;
      } else if (name.startsWith("project-") || name.startsWith("proj-")) {
        inferredType = "project";
        potentialName = channel.name
          .replace(/^(project-|proj-)/, "")
          .replace(/-/g, " ");
        projectChannels++;
      } else if (name.startsWith("team-")) {
        inferredType = "team";
        potentialName = channel.name.replace(/^team-/, "").replace(/-/g, " ");
        teamChannels++;
      }

      await upsertContextEntry(orgId, {
        entryType: "ENTITY",
        category: "slack_channel",
        key: `slack_channel_${channel.id}`,
        value: {
          channelId: channel.id,
          name: channel.name,
          memberCount: channel.num_members,
          inferredType,
          potentialName,
          source: "slack",
        },
      });
    }

    // Workspace info
    let workspaceName = "";
    try {
      const teamResp = await nango.proxy({
        method: "GET",
        endpoint: "/api/team.info",
        connectionId,
        providerConfigKey: "slack",
      });
      workspaceName =
        (teamResp.data as { team?: { name?: string } })?.team?.name ?? "";
    } catch {
      // Non-critical
    }

    await upsertContextEntry(orgId, {
      entryType: "PREFERENCE",
      category: "integration_status",
      key: "slack_seeded",
      value: {
        seededAt: new Date().toISOString(),
        channelCount: channels.length,
        clientChannels,
        projectChannels,
        teamChannels,
        workspaceName,
        provider: "slack",
      },
    });

    console.log(
      `[seeders] Slack seeded ${channels.length} channels for org ${orgId} ` +
        `(${clientChannels} client, ${projectChannels} project, ${teamChannels} team)`
    );
  } catch (err) {
    console.error(
      `[seeders] Slack seeding failed for org ${orgId}:`,
      err
    );
  }
}

// ---------------------------------------------------------------------------
// HubSpot seeder
// ---------------------------------------------------------------------------

export async function seedHubSpotContext(
  connectionId: string,
  orgId: string
): Promise<void> {
  const nango = getNangoClient();

  try {
    // Companies
    const companiesResp = await nango.proxy({
      method: "GET",
      endpoint: "/crm/v3/objects/companies",
      connectionId,
      providerConfigKey: "hubspot",
      params: {
        limit: "20",
        properties: "name,domain,industry",
      },
    });

    const companiesData = companiesResp.data as {
      results?: Array<{
        id: string;
        properties: Record<string, string>;
      }>;
    };
    const companies = companiesData?.results ?? [];

    for (const company of companies) {
      await upsertContextEntry(orgId, {
        entryType: "ENTITY",
        category: "company",
        key: `hubspot_company_${company.id}`,
        value: {
          hubspotId: company.id,
          name: company.properties.name,
          domain: company.properties.domain,
          industry: company.properties.industry,
          source: "hubspot",
          potentialClient: true,
        },
      });
    }

    // Contacts
    const contactsResp = await nango.proxy({
      method: "GET",
      endpoint: "/crm/v3/objects/contacts",
      connectionId,
      providerConfigKey: "hubspot",
      params: {
        limit: "20",
        properties: "firstname,lastname,email,company",
      },
    });

    const contactsData = contactsResp.data as {
      results?: Array<{
        id: string;
        properties: Record<string, string>;
      }>;
    };
    const contacts = contactsData?.results ?? [];

    for (const contact of contacts) {
      const fullName = [
        contact.properties.firstname,
        contact.properties.lastname,
      ]
        .filter(Boolean)
        .join(" ");
      await upsertContextEntry(orgId, {
        entryType: "ENTITY",
        category: "contact",
        key: `hubspot_contact_${contact.id}`,
        value: {
          hubspotId: contact.id,
          name: fullName,
          email: contact.properties.email,
          company: contact.properties.company,
          source: "hubspot",
        },
      });
    }

    await upsertContextEntry(orgId, {
      entryType: "PREFERENCE",
      category: "integration_status",
      key: "hubspot_seeded",
      value: {
        seededAt: new Date().toISOString(),
        companyCount: companies.length,
        contactCount: contacts.length,
        provider: "hubspot",
      },
    });

    console.log(
      `[seeders] HubSpot seeded ${companies.length} companies, ` +
        `${contacts.length} contacts for org ${orgId}`
    );
  } catch (err) {
    console.error(
      `[seeders] HubSpot seeding failed for org ${orgId}:`,
      err
    );
  }
}
