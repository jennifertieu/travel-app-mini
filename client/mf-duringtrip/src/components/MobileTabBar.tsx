import { Sparkles, List, Map } from 'lucide-react';
import { cn } from '../lib/utils';

export type MobileTab = 'ask-ai' | 'list' | 'map';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
}

const tabs: { id: MobileTab; label: string; icon: typeof Sparkles }[] = [
  { id: 'ask-ai', label: 'Ask AI', icon: Sparkles },
  { id: 'list', label: 'List', icon: List },
  { id: 'map', label: 'Map', icon: Map },
];

export function MobileTabBar({ activeTab, onChangeTab }: MobileTabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1002] bg-white border-t border-gray-200 md:hidden">
      <div className="flex h-[60px]">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onChangeTab(id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                isActive ? 'text-teal-600' : 'text-gray-400',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
