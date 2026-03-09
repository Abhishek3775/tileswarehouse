'use strict';

const Joi = require('joi');

const createRackSchema = Joi.object({

  warehouse_id: Joi.string().uuid().required(),

  zone: Joi.string().max(50).allow(null, ''),

  name: Joi.string().min(1).max(100).required(),

  aisle: Joi.string().max(50).allow(null, ''),

  row: Joi.string().max(50).allow(null, ''),

  level: Joi.string().max(50).allow(null, ''),

  rack_type: Joi.string()
    .valid('PALLET', 'SHELF', 'FLOOR')
    .default('PALLET'),

  capacity_boxes: Joi.number().integer().min(0).allow(null),

  occupied_boxes: Joi.number().integer().min(0).default(0),

  available_boxes: Joi.number().integer().min(0).allow(null),

  max_weight: Joi.number().precision(2).allow(null),

  rack_status: Joi.string()
    .valid('ACTIVE', 'BLOCKED', 'MAINTENANCE', 'FULL')
    .default('ACTIVE'),

  qr_code: Joi.string().max(255).allow(null, ''),

  notes: Joi.string().allow(null, ''),

  created_by: Joi.string().uuid().allow(null),

  is_active: Joi.boolean()
    .truthy('1')
    .truthy('true')
    .falsy('0')
    .falsy('false')
    .default(true),

});

const updateRackSchema = createRackSchema.min(1);

const listQuerySchema = Joi.object({

  page: Joi.number().integer().min(1).optional(),

  limit: Joi.number().integer().min(1).max(100).optional(),

  search: Joi.string().max(100).allow('').optional(),

  sortBy: Joi.string().valid('name', 'aisle', 'created_at').optional(),

  sortOrder: Joi.string().valid('ASC', 'DESC').optional(),

  is_active: Joi.boolean()
    .truthy('1')
    .truthy('true')
    .falsy('0')
    .falsy('false')
    .optional(),

  warehouse_id: Joi.string().uuid().optional(),

});

module.exports = {
  createRackSchema,
  updateRackSchema,
  listQuerySchema,
};