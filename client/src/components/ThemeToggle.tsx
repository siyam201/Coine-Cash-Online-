import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      <Switch
        id="theme-toggle"
        checked={theme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
      <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
    </div>
  );
}

export function ThemeToggleWithLabels() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="theme-toggle" className="text-sm text-gray-600 dark:text-gray-400">লাইট</Label>
      <Switch
        id="theme-toggle"
        checked={theme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
      <Label htmlFor="theme-toggle" className="text-sm text-gray-600 dark:text-gray-400">ডার্ক</Label>
    </div>
  );
}
