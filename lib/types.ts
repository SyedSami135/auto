export interface OemReturn {
  request_id: number;
  ticket_link: string;
  order_number: string;
  sku: string;
  customer_name: string;
  priority: string;
  om_request: string;
  status: string;
  om_update: string | null;
  last_follow_up: string | null;
  request_date: string | null;
  designated_om_agent: string | null;
}

export interface ReturnsResponse {
  rows: OemReturn[];
  total: number;
  stats: {
    totalReturns: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

export interface ReturnsQueryParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
  status?: string;
  customer?: string;
  sku?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
