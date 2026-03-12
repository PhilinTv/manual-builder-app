"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateUserDialog } from "./create-user-dialog";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
  status: "PENDING" | "ACTIVE" | "DEACTIVATED";
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/users${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function updateUser(id: string, data: { status?: string; role?: string }) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchUsers();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter by status:</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>Create User</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Select
                  value={user.role}
                  onValueChange={(value) => updateUser(user.id, { role: value })}
                >
                  <SelectTrigger className="w-28" aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {user.status === "PENDING" && "Pending"}
                {user.status === "ACTIVE" && "Active"}
                {user.status === "DEACTIVATED" && "Deactivated"}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {user.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateUser(user.id, { status: "ACTIVE" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateUser(user.id, { status: "DEACTIVATED" })}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {user.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateUser(user.id, { status: "DEACTIVATED" })}
                    >
                      Deactivate
                    </Button>
                  )}
                  {user.status === "DEACTIVATED" && (
                    <Button
                      size="sm"
                      onClick={() => updateUser(user.id, { status: "ACTIVE" })}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={fetchUsers}
      />
    </div>
  );
}
