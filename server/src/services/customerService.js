import { facilityRepository } from '../repositories/facilityRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { createError } from '../middleware/errorHandler.js';

function formatPhone(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return phone;
}

function mapCustomer(row) {
  return {
    id: row.id,
    facilityId: row.facility_id,
    facilityName: row.facility_name,
    facilityCode: row.facility_code,
    phone: row.phone_number,
    phoneDisplay: formatPhone(row.phone_number),
    marketingAgreed: row.marketing_agreed,
    marketingAgreedAt: row.marketing_agreed_at,
    registeredAt: row.registered_at || row.first_registered_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseMarketing(queryValue) {
  if (queryValue == null || queryValue === '') return [];
  if (Array.isArray(queryValue)) return queryValue.map(String);
  return String(queryValue)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseCustomerListQuery(query = {}) {
  return {
    startDate: query.startDate ? String(query.startDate) : '',
    endDate: query.endDate ? String(query.endDate) : '',
    phone: query.phone ? String(query.phone).replace(/\D/g, '') : '',
    facilityName: query.facilityName ? String(query.facilityName).trim() : '',
    marketing: parseMarketing(query.marketing),
    page: Number(query.page || 1),
    pageSize: Number(query.pageSize || 500),
  };
}

export const customerService = {
  async listByFacility(facilityCode, filters) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const { rows, total, page, pageSize } = await customerRepository.listByFacility(
      facility.id,
      filters
    );
    return {
      items: rows.map(mapCustomer),
      total,
      page,
      pageSize,
    };
  },

  async listAll(filters) {
    const { rows, total, page, pageSize } = await customerRepository.listAll(filters);
    return {
      items: rows.map(mapCustomer),
      total,
      page,
      pageSize,
    };
  },
};
