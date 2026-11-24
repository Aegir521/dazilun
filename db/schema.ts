import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const members = sqliteTable('members', { id:text('id').primaryKey(), name:text('name').notNull() });
export const pairs = sqliteTable('pairs', { id:text('id').primaryKey(), a:text('a').notNull(), b:text('b').notNull(), body:text('body').notNull(), revision:integer('revision').notNull() });