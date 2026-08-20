import Link from "next/link";
import { loginAction } from "./actions";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/constants";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label, TextInput, FieldError } from "@/components/ui/FormField";

export default async function LoginPage({ searchParams }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === ROLES.ADMIN ? "/admin" : "/client");

  return (
    <main className="senior-portal mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-center text-3xl font-bold text-blue-900">Helping Hands</h1>
      <p className="mb-8 text-center text-slate-600">Sign in to your account</p>

      <Card>
        <form action={loginAction} className="space-y-5">
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
              autoComplete="current-password"
              required
            />
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-slate-600">
        New here?{" "}
        <Link href="/register" className="font-semibold text-blue-700 underline">
          Create an account
        </Link>
      </p>

      <details className="mt-8 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold">Demo accounts (seed data)</summary>
        <ul className="mt-2 space-y-1">
          <li>Admin: admin@helpinghands.example / password123</li>
          <li>Client: eleanor@example.com / password123</li>
          <li>Family member: mark@example.com / password123</li>
        </ul>
      </details>
    </main>
  );
}
