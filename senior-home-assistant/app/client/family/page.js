import { getCurrentUser, clientForUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { inviteFamilyMemberAction, revokeInviteAction } from "./actions";
import { ROLES, INVITE_STATUS } from "@/lib/constants";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/FormField";

export default async function FamilyPage() {
  const user = await getCurrentUser();
  const client = clientForUser(user);
  const isOwner = user.role === ROLES.CLIENT;

  const [members, invites] = await Promise.all([
    prisma.user.findMany({ where: { clientId: client.id } }),
    prisma.familyInvite.findMany({
      where: { clientId: client.id, status: INVITE_STATUS.PENDING },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-blue-900">Family Access</h1>

      <Card>
        <h2 className="mb-2 text-xl font-bold text-slate-800">Who has access</h2>
        <ul className="divide-y divide-slate-200">
          <li className="py-3">
            <span className="font-semibold">{client.owner?.name ?? "You"}</span>
            <span className="ml-2 text-slate-500">Account holder</span>
          </li>
          {members.map((m) => (
            <li key={m.id} className="py-3">
              <span className="font-semibold">{m.name}</span>
              <span className="ml-2 text-slate-500">{m.email} - Family member</span>
            </li>
          ))}
        </ul>
      </Card>

      {isOwner && (
        <>
          <Card>
            <h2 className="mb-4 text-xl font-bold text-slate-800">Invite a family member</h2>
            <p className="mb-4 text-slate-600">
              They&apos;ll be able to view and add tasks and see visit history, but won&apos;t see
              billing details.
            </p>
            <form action={inviteFamilyMemberAction} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <Label htmlFor="email">Email address</Label>
                <TextInput id="email" name="email" type="email" required />
              </div>
              <Button type="submit">Send Invite</Button>
            </form>
          </Card>

          {invites.length > 0 && (
            <Card>
              <h2 className="mb-4 text-xl font-bold text-slate-800">Pending invites</h2>
              <ul className="space-y-4">
                {invites.map((invite) => (
                  <li key={invite.id} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-semibold">{invite.email}</p>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      Share this link with them:{" "}
                      <span className="font-mono">/invite/{invite.token}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      (In production this link would be emailed automatically - see README
                      &quot;Future work&quot;.)
                    </p>
                    <form action={revokeInviteAction} className="mt-2">
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button type="submit" className="font-semibold text-red-700 underline">
                        Revoke invite
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
