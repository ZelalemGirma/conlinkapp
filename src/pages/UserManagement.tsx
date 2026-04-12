import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Users, Shield, UserCheck, User } from 'lucide-react';

interface UserWithRole {
  user_id: string;
  full_name: string;
  role: UserRole;
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-destructive/10 text-destructive border-destructive/20' },
  manager: { label: 'Manager', icon: UserCheck, color: 'bg-primary/10 text-primary border-primary/20' },
  rep: { label: 'Rep', icon: User, color: 'bg-muted text-muted-foreground' },
};

const UserManagement = () => {
  const { role: currentRole, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all_users_with_roles'],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesErr) throw rolesErr;

      if (!roles?.length) return [];

      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      if (profErr) throw profErr;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);

      return roles.map(r => ({
        user_id: r.user_id,
        full_name: profileMap.get(r.user_id)?.full_name || 'Unknown',
        role: r.role as UserRole,
      }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_users_with_roles'] });
      queryClient.invalidateQueries({ queryKey: ['reps'] });
      toast.success('Role updated successfully');
    },
    onError: (err: Error) => {
      toast.error('Failed to update role: ' + err.message);
    },
  });

  if (currentRole !== 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-secondary">User Management</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">User Management</h1>
        <p className="text-muted-foreground">Manage users and assign roles</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['admin', 'manager', 'rep'] as UserRole[]).map(r => {
          const cfg = ROLE_CONFIG[r];
          const Icon = cfg.icon;
          return (
            <Card key={r}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg p-2 ${cfg.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleCounts[r] || 0}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading users…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => {
                  const isSelf = u.user_id === user?.id;
                  const cfg = ROLE_CONFIG[u.role];
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-secondary/10 text-secondary">
                              {getInitials(u.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{u.full_name}</p>
                            {isSelf && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.color}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(val) =>
                            updateRole.mutate({ userId: u.user_id, newRole: val as UserRole })
                          }
                          disabled={isSelf}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="rep">Rep</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
