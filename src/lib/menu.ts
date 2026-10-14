import { text, integer, boolean } from './validation';

export function menuItem(body: Record<string, unknown> | null) {
    return {
        name_no: text(body?.name_no, 'Norwegian name', 1, 100),
        name_en: text(body?.name_en, 'English name', 1, 100),
        desc_no: text(body?.desc_no ?? '', 'Norwegian description'),
        desc_en: text(body?.desc_en ?? '', 'English description'),
        price: integer(body?.price, 'price', 0, 100000),
        is_active: boolean(body?.is_active ?? true, 'active flag'),
    };
}
