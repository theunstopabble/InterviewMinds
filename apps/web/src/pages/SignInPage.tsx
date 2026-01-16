import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
          InterviewMinds.ai
        </h1>
        <p className="text-gray-400">
          Sign in to start your AI Interview journey
        </p>
      </div>

      {/* Clerk ka bana-banaya Login Component */}
      <SignIn />
    </div>
  );
}
