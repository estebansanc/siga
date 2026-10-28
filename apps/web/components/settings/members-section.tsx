"use client";

import type { MemberDto } from "@repo/api/client";
import { memberRoleLabels } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@repo/ui/components/item";
import { Skeleton } from "@repo/ui/components/skeleton";
import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useMembers, useRemoveMember } from "@/hooks/use-members";
import { showRequestError } from "@/lib/form-errors";

import { ConfirmDialog } from "./confirm-dialog";

function MemberItem({
  member,
  isCurrentUser,
  onRemove,
}: {
  member: MemberDto;
  isCurrentUser: boolean;
  onRemove: () => void;
}) {
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {member.name}
          <Badge variant={member.role === "owner" ? "default" : "secondary"}>
            {memberRoleLabels[member.role]}
          </Badge>
          {isCurrentUser ? <span className="text-muted-foreground text-xs">(vos)</span> : null}
        </ItemTitle>
        <ItemDescription>{member.email}</ItemDescription>
      </ItemContent>
      {member.role === "member" ? (
        <ItemActions>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={`Acciones de ${member.name}`} />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                Quitar de la organización
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ItemActions>
      ) : null}
    </Item>
  );
}

export function MembersSection({ currentUserId }: { currentUserId: string }) {
  const members = useMembers();
  const removeMember = useRemoveMember();
  const [removing, setRemoving] = useState<MemberDto | null>(null);

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await removeMember.mutateAsync(removing.userId);
      toast.success("Miembro quitado");
      setRemoving(null);
    } catch (error) {
      showRequestError(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Miembros</CardTitle>
        <CardDescription>
          Quiénes pueden entrar a esta organización. Las cuentas nuevas se dan de alta en Usuarios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <ItemGroup className="gap-2">
            {members.data?.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                isCurrentUser={member.userId === currentUserId}
                onRemove={() => setRemoving(member)}
              />
            ))}
          </ItemGroup>
        )}
      </CardContent>

      {removing ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setRemoving(null)}
          title={`¿Quitar a ${removing.name}?`}
          description="Deja de ver esta organización. Su cuenta y su organización propia siguen igual; puede volver a entrar cuando quieras."
          confirmLabel="Quitar"
          pending={removeMember.isPending}
          onConfirm={confirmRemove}
        />
      ) : null}
    </Card>
  );
}
