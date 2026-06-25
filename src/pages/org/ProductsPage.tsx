import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { orgApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import type { Product } from '@/types/api';
import { CreateProductDialog } from '@/components/products/CreateProductDialog';
import { AdjustStockDialog } from '@/components/products/AdjustStockDialog';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function isLowStock(product: Product): boolean {
  return (
    product.trackInventory &&
    product.lowStockThreshold != null &&
    product.stockQuantity <= product.lowStockThreshold
  );
}

export function ProductsPage() {
  const orgId = useOrgId();
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', orgId],
    queryFn: () => orgApi.listProducts(orgId),
    enabled: !!orgId,
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['products', orgId, 'low-stock'],
    queryFn: () => orgApi.listLowStockProducts(orgId),
    enabled: !!orgId,
  });

  if (isLoading) return <LoadingState />;

  const products = data?.products ?? [];
  const lowStockCount = lowStockData?.products.length ?? 0;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {lowStockCount} product{lowStockCount === 1 ? '' : 's'} low on stock
          </div>
        )}
        <div className="flex justify-end sm:ml-auto">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products"
          description="Add retail products to sell at checkout."
          action={<Button onClick={() => setCreateOpen(true)}>Add Product</Button>}
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-stone-500">{p.sku ?? '—'}</TableCell>
                  <TableCell>{formatCurrency(p.retailPriceCents)}</TableCell>
                  <TableCell>
                    <span className={isLowStock(p) ? 'font-medium text-amber-700' : undefined}>
                      {p.stockQuantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? 'success' : 'secondary'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setAdjustProduct(p)}>
                      Adjust stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <CreateProductDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
      <AdjustStockDialog
        orgId={orgId}
        product={adjustProduct}
        open={!!adjustProduct}
        onOpenChange={(open) => !open && setAdjustProduct(null)}
      />
    </div>
  );
}
