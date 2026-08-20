import { prisma } from "@/lib/prisma";
import { acceptInviteAction } from "./actions";
import { INVITE_STATUS } from "@/lib/constants";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label, TextInput, FieldError } from "@/components/ui/FormField";

export default async function AcceptInvitePage({ params, searchParams }) {
  const { token } = await params;
  const { error } = await searchParams;

  const invite = await prisma.familyInvite.findUnique({ where: { token } });

  if (!invite || invite.status !== INVITE_STATUS.PENDING) {
    return (
      <main className="senior-portal mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <h1 className="text-2xl font-bold text-red-800">Invite not found</h1>
          <p className="mt-2 text-slate-600">
            This invite link is invalid or has already been used.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="senior-portal mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-center text-3xl font-bold text-blue-900">
        You&apos;ve been invited!
      </h1>
      <p className="mb-8 text-center text-slate-600">
        Create your account to help manage tasks for your family member.
      </p>

      <Card>
        <form action={acceptInviteAction} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          <div>
            <Label htmlFor="email">Email</Label>
            <TextInput id="email" value={invite.email} disabled />
          </div>
          <div>
            <Label htmlFor="name">Your name</Label>
            <TextInput id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="password">Choose a password</Label>
            <TextInput
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
      </Card>
    </main>
  );
}
