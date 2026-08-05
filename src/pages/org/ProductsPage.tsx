import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Package, PackagePlus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { orgApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import type { Product } from '@/types/api';
import { CreateProductDialog } from '@/components/products/CreateProductDialog';
import { AdjustStockDialog } from '@/components/products/AdjustStockDialog';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
import { Panel } from '@/components/common/Panel';
import { TableIconButton } from '@/components/common/TableIconButton';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function isLowStock(product: Product): boolean {
  return (
    product.trackInventory &&
    product.lowStockThreshold != null &&
    product.stockQuantity <= product.lowStockThreshold
  );
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'low_stock';

export function ProductsPage() {
  const orgId = useOrgId();
  const trialExpired = useOrgWriteLocked();
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  const products = data?.products ?? [];
  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (statusFilter === 'active' && !p.isActive) return false;
        if (statusFilter === 'inactive' && p.isActive) return false;
        if (statusFilter === 'low_stock' && !isLowStock(p)) return false;
        return matchesSearch(search, p.name, p.sku, p.barcode, p.description);
      }),
    [products, search, statusFilter],
  );

  if (isLoading) return <LoadingState />;

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
          <TrialLockedControl locked={trialExpired}>
            <Button onClick={() => setCreateOpen(true)} disabled={trialExpired}>
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </TrialLockedControl>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products"
          description="Add retail products to sell at checkout."
          action={
            <TrialLockedControl locked={trialExpired}>
              <Button onClick={() => setCreateOpen(true)} disabled={trialExpired}>Add Product</Button>
            </TrialLockedControl>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, SKU…"
            filters={
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="low_stock">Low stock</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          {filtered.length === 0 ? (
            <EmptyState icon={Package} title="No products match" description="Try a different search or filter." />
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
                  {filtered.map((p) => (
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
                        <TrialLockedControl locked={trialExpired}>
                          <TableIconButton
                            icon={PackagePlus}
                            label="Adjust stock"
                            onClick={() => setAdjustProduct(p)}
                            disabled={trialExpired}
                          />
                        </TrialLockedControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </>
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
