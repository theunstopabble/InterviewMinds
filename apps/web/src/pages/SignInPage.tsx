import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
          InterviewMinds
        </h1>
        <p className="text-gray-400">
          Sign in to start your AI Interview journey
        </p>
      </div>

      {/* Clerk ka bana-banaya Login Component */}
      <SignIn />

      <div className="mt-8 text-center">
        <p className="text-gray-500 text-xs mb-2">Don't have a resume yet?</p>
        <a
          href="https://texfolio.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Build one with TexFolio →
        </a>
      </div>
    </div>
  );
}
