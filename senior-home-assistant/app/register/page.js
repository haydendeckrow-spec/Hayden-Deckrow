import { prisma } from "@/lib/prisma";
import { registerAction } from "./actions";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/constants";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label, TextInput, Select, FieldError } from "@/components/ui/FormField";

export default async function RegisterPage({ searchParams }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === ROLES.ADMIN ? "/admin" : "/client");

  const tiers = await prisma.subscriptionTier.findMany({ orderBy: { monthlyPrice: "asc" } });

  return (
    <main className="senior-portal mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-center text-3xl font-bold text-blue-900">Create your account</h1>
      <p className="mb-8 text-center text-slate-600">Sign up as a subscriber</p>

      <Card>
        <form action={registerAction} className="space-y-5">
          <div>
            <Label htmlFor="name">Full name</Label>
            <TextInput id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <TextInput id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <TextInput
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div>
            <Label htmlFor="address">Home address</Label>
            <TextInput id="address" name="address" required />
          </div>
          <div>
            <Label htmlFor="subscriptionTierId">Subscription plan</Label>
            <Select id="subscriptionTierId" name="subscriptionTierId" required defaultValue="">
              <option value="" disabled>
                Choose a plan
              </option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} - ${tier.monthlyPrice}/mo
                </option>
              ))}
            </Select>
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue-700 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
