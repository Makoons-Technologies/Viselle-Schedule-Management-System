import { Minus, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/api';
import { sectionMutedClass } from '@/components/common/Panel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CheckoutProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  quantitiesByProductId: Record<string, number>;
  onSetProductQuantity: (productId: string, quantity: number) => void;
}

function matchesProductSearch(product: Product, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return (
    product.name.toLowerCase().includes(normalized) ||
    (product.sku?.toLowerCase().includes(normalized) ?? false) ||
    (product.barcode?.toLowerCase().includes(normalized) ?? false) ||
    (product.description?.toLowerCase().includes(normalized) ?? false)
  );
}

export function CheckoutProductPickerDialog({
  open,
  onOpenChange,
  products,
  quantitiesByProductId,
  onSetProductQuantity,
}: CheckoutProductPickerDialogProps) {
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesProductSearch(product, search)),
    [products, search],
  );

  const selectedCount = useMemo(
    () => Object.values(quantitiesByProductId).reduce((sum, qty) => sum + qty, 0),
    [quantitiesByProductId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,720px)] max-w-lg flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add products</DialogTitle>
          <DialogDescription>Search and add items to this checkout.</DialogDescription>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or barcode…"
            className="pl-9"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {products.length === 0 ? (
            <p className={cn('py-8 text-center text-sm', sectionMutedClass)}>No active products available.</p>
          ) : filteredProducts.length === 0 ? (
            <p className={cn('py-8 text-center text-sm', sectionMutedClass)}>No products match your search.</p>
          ) : (
            <ul className="space-y-2">
              {filteredProducts.map((product) => {
                const quantity = quantitiesByProductId[product.id] ?? 0;
                const outOfStock =
                  product.trackInventory && product.stockQuantity <= 0 && quantity === 0;

                return (
                  <li
                    key={product.id}
                    className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-stone-900 dark:text-stone-100">{product.name}</p>
                      <p className={cn('text-xs', sectionMutedClass)}>
                        {formatCurrency(product.retailPriceCents)}
                        {product.sku ? ` · SKU ${product.sku}` : ''}
                        {product.trackInventory ? ` · ${product.stockQuantity} in stock` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={quantity === 0}
                        onClick={() => onSetProductQuantity(product.id, quantity - 1)}
                        aria-label={`Remove one ${product.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium tabular-nums">{quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={
                          outOfStock ||
                          (product.trackInventory && quantity >= product.stockQuantity)
                        }
                        onClick={() => onSetProductQuantity(product.id, quantity + 1)}
                        aria-label={`Add one ${product.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="mt-4 shrink-0 border-t border-stone-200 pt-4 dark:border-stone-800">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done{selectedCount > 0 ? ` (${selectedCount} item${selectedCount === 1 ? '' : 's'})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
