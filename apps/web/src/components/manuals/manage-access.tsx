"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Assignee {
  id: string;
  name: string;
  email: string;
}

interface ActiveUser {
  id: string;
  name: string;
  email: string;
}

interface ManageAccessProps {
  manualId: string;
  assignees: Assignee[];
  onUpdate: () => void;
}

export function ManageAccess({ manualId, assignees, onUpdate }: ManageAccessProps) {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch("/api/users?status=ACTIVE");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users.filter((u: any) => u.role === "EDITOR"));
      }
    }
    fetchUsers();
  }, []);

  const availableUsers = users.filter(
    (u) => !assignees.some((a) => a.id === u.id)
  );

  async function handleAssign() {
    if (!selectedUserId) return;

    const res = await fetch(`/api/manuals/${manualId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    });

    if (res.ok) {
      toast.success("User assigned successfully");
      setSelectedUserId("");
      onUpdate();
    } else {
      toast.error("Failed to assign user");
    }
  }

  async function handleRemove(userId: string) {
    const res = await fetch(`/api/manuals/${manualId}/assignments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (res.ok || res.status === 204) {
      toast.success("User unassigned successfully");
      onUpdate();
    } else {
      toast.error("Failed to unassign user");
    }
  }

  return (
    <div data-testid="manage-access" className="space-y-4">
      <h3 className="text-lg font-semibold">Manage Access</h3>

      {assignees.length > 0 && (
        <div className="space-y-2">
          {assignees.map((assignee) => (
            <div
              key={assignee.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-medium">{assignee.name}</p>
                <p className="text-xs text-muted-foreground">{assignee.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(assignee.id)}
                aria-label="Remove"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {availableUsers.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select editor to assign..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAssign} disabled={!selectedUserId}>
            Assign
          </Button>
        </div>
      )}

      {assignees.length === 0 && availableUsers.length === 0 && (
        <p className="text-sm text-muted-foreground">No editors available to assign.</p>
      )}
    </div>
  );
}
