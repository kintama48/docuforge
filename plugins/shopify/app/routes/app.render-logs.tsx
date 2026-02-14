import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  BlockStack,
  EmptyState,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate, prisma } from "~/shopify.server";

interface RenderLogEntry {
  id: string;
  orderId: string | null;
  templateId: string;
  status: string;
  renderId: string | null;
  errorMessage: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

interface LoaderData {
  logs: RenderLogEntry[];
  total: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 50;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.renderLog.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.renderLog.count({ where: { shop } }),
  ]);

  return json<LoaderData>({
    logs: logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
  });
}

function statusTone(status: string): "success" | "critical" | "attention" | "info" {
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "critical";
    case "pending":
      return "attention";
    default:
      return "info";
  }
}

export default function RenderLogsPage() {
  const { logs, total } = useLoaderData<LoaderData>();

  const resourceName = {
    singular: "render log",
    plural: "render logs",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(logs);

  const rowMarkup = logs.map((log, index) => (
    <IndexTable.Row
      id={log.id}
      key={log.id}
      selected={selectedResources.includes(log.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd">
          {new Date(log.createdAt).toLocaleString()}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd">
          {log.orderId || "-"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {log.templateId}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={statusTone(log.status)}>{log.status}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued">
          {log.renderId || "-"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {log.errorMessage ? (
          <Text as="span" variant="bodySm" tone="critical">
            {log.errorMessage.length > 80
              ? log.errorMessage.slice(0, 80) + "..."
              : log.errorMessage}
          </Text>
        ) : (
          <Text as="span" variant="bodySm" tone="subdued">
            -
          </Text>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page title="Render Logs">
      <Card>
        <BlockStack gap="400">
          {logs.length === 0 ? (
            <EmptyState
              heading="No render logs yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Render logs will appear here once PDFs are generated from order
                events or manual triggers.
              </p>
            </EmptyState>
          ) : (
            <>
              <Text as="p" variant="bodySm" tone="subdued">
                Showing {logs.length} of {total} total logs
              </Text>
              <IndexTable
                resourceName={resourceName}
                itemCount={logs.length}
                selectedItemsCount={
                  allResourcesSelected ? "All" : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: "Date" },
                  { title: "Order ID" },
                  { title: "Template" },
                  { title: "Status" },
                  { title: "Render ID" },
                  { title: "Error" },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>
            </>
          )}
        </BlockStack>
      </Card>
    </Page>
  );
}
