import { FC } from 'react';

interface NavTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: NavTab[];
}

const Navigation: FC<NavigationProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Navigation;
