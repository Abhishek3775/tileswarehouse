import axiosInstance from './axios';
import { ApiResponse, ApiPaginatedResponse, PaginationParams } from '../types/api.types';
import { Invoice, CreateInvoiceFromSODto } from '../types/invoice.types';

/**
 * Invoice API Service
 * Base: /invoices
 *
 * Routes:
 *   GET    /invoices            — list
 *   GET    /invoices/:id        — single with items
 *   POST   /invoices            — create invoice from sales order
 *   POST   /invoices/:id/issue  — issue the invoice (finalise)
 *
 * Role required: super_admin | admin | accountant
 */
export const invoiceApi = {
  getAll: async (
    params?: PaginationParams & { customerId?: string; status?: string; from?: string; to?: string }
  ): Promise<ApiPaginatedResponse<Invoice>> => {
    const res = await axiosInstance.get<ApiPaginatedResponse<Invoice>>('/invoices', { params });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<Invoice>> => {
    const res = await axiosInstance.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return res.data;
  },

  /**
   * Generate an invoice from an existing confirmed Sales Order.
   */
  createFromSO: async (data: CreateInvoiceFromSODto): Promise<ApiResponse<Invoice>> => {
    const res = await axiosInstance.post<ApiResponse<Invoice>>('/invoices', data);
    return res.data;
  },

  /**
   * Issue (finalise) a draft invoice — status changes to 'issued'.
   */
  issueInvoice: async (id: string): Promise<ApiResponse<Invoice>> => {
    const res = await axiosInstance.post<ApiResponse<Invoice>>(`/invoices/${id}/issue`);
    return res.data;
  },
};
