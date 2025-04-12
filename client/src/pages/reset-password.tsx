import { PasswordReset } from "@/components/PasswordReset";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-200 flex">
      <div className="container grid lg:grid-cols-2 lg:max-w-none lg:px-0 mx-auto">
        {/* Left column - Hidden on mobile */}
        <div className="relative hidden h-full flex-col bg-gradient-to-br from-green-600 to-blue-700 p-10 text-white lg:flex overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-700/50 to-transparent" />
          
          <div className="relative z-20 flex items-center text-lg font-medium mb-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full flex items-center justify-center overflow-hidden bg-white/10">
                <img src="/images/logo.svg" alt="Coine Cash Online Logo" className="h-12 w-12" />
              </div>
            </div>
            <span className="ml-2 text-xl">Coine Cash Online</span>
          </div>
          
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;Coine Cash Online lets you send money to anyone, anywhere, anytime with just a few clicks.&rdquo;
              </p>
              <footer className="text-sm text-blue-200">Seium Mahmud</footer>
            </blockquote>
          </div>
        </div>
        
        {/* Right column - Form */}
        <div className="flex items-center justify-center p-4 lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600">
                Reset Your Password
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your email to receive a verification code to reset your password
              </p>
            </div>
            <PasswordReset />
          </div>
        </div>
      </div>
    </div>
  );
}