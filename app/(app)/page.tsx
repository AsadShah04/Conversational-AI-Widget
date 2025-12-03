import { ApplyThemeScript } from '@/components/theme-toggle';
import WelcomeDynamic from '@/components/welcome-dynamic';

export default function Page() {
  return (
    <div className="bg-white">
      <ApplyThemeScript />
      <WelcomeDynamic />
    </div>
  );
}
