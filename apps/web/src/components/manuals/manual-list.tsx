"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Star } from "lucide-react";
import { FavoriteToggle } from "@/components/manuals/favorite-toggle";
import { usePersistedFilter } from "@/lib/hooks/use-persisted-filter";

interface ManualRow {
  id: string;
  productName: string;
  status: string;
  assignments: { user: { id: string; name: string } }[];
  updatedAt: string;
}

interface ManualListProps {
  userRole: string;
}

export function ManualList({ userRole }: ManualListProps) {
  const router = useRouter();
  const [manuals, setManuals] = useState<ManualRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesFilter, setFavoritesFilter] = usePersistedFilter("favorites-filter", false);
  const pageSize = 20;

  const fetchManuals = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());
    if (search) params.set("search", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (assigneeFilter !== "ALL") params.set("assigneeId", assigneeFilter);

    const res = await fetch(`/api/manuals?${params}`);
    if (res.ok) {
      const data = await res.json();
      setManuals(data.manuals);
      setTotal(data.total);
    }
  }, [page, search, statusFilter, assigneeFilter]);

  useEffect(() => {
    fetchManuals();
  }, [fetchManuals]);

  // Fetch user's favorites
  useEffect(() => {
    async function fetchFavorites() {
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(new Set(data.manualIds));
      }
    }
    fetchFavorites();
  }, []);

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch("/api/users?status=ACTIVE");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    }
    fetchUsers();
  }, []);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, assigneeFilter]);

  async function handleCreateManual() {
    const res = await fetch("/api/manuals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName: "Untitled Manual" }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/manuals/${data.manual.id}`);
    }
  }

  function handleFavoriteToggle(manualId: string, favorited: boolean) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (favorited) {
        next.add(manualId);
      } else {
        next.delete(manualId);
      }
      return next;
    });
  }

  const totalPages = Math.ceil(total / pageSize);
  const isAdmin = userRole === "ADMIN";

  // Apply client-side favorites filter
  const displayedManuals = favoritesFilter
    ? manuals.filter((m) => favoriteIds.has(m.id))
    : manuals;

  if (manuals.length === 0 && !search && statusFilter === "ALL" && assigneeFilter === "ALL" && !favoritesFilter) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-muted-foreground">Create your first manual</p>
        {isAdmin && (
          <Button onClick={handleCreateManual} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            New Manual
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search manuals..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {["ALL", "DRAFT", "PUBLISHED"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === "ALL" ? "All" : s === "DRAFT" ? "Draft" : "Published"}
              </Button>
            ))}
          </div>
          <Button
            variant={favoritesFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setFavoritesFilter(!favoritesFilter)}
          >
            <Star className={cn("mr-1 h-3 w-3", favoritesFilter && "fill-current")} />
            Favorites
          </Button>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40" aria-label="Assignee">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Assignees</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={handleCreateManual}>
              <Plus className="mr-2 h-4 w-4" />
              New Manual
            </Button>
          )}
        </div>
      </div>

      {/* Favorites empty state */}
      {favoritesFilter && displayedManuals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Star className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">No favorites yet</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setFavoritesFilter(false)}
          >
            Browse all manuals
          </Button>
        </div>
      ) : (
        <>
          {/* Manual rows */}
          <div className="space-y-2">
            {displayedManuals.map((manual) => (
              <div
                key={manual.id}
                data-testid="manual-row"
                className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/manuals/${manual.id}`)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FavoriteToggle
                    manualId={manual.id}
                    initialFavorited={favoriteIds.has(manual.id)}
                    onToggle={(fav) => handleFavoriteToggle(manual.id, fav)}
                  />
                  <div className="min-w-0 flex-1">
                    <p data-testid="manual-product-name" className="font-medium truncate">
                      {manual.productName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span data-testid="manual-updated-at">
                        {new Date(manual.updatedAt).toLocaleDateString()}
                      </span>
                      {manual.assignments.length > 0 && (
                        <span data-testid="manual-assignees">
                          {manual.assignments.map((a) => a.user.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  data-testid="manual-status-badge"
                  className={cn(
                    "ml-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    manual.status === "DRAFT"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  )}
                >
                  {manual.status === "DRAFT" ? "Draft" : "Published"}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
