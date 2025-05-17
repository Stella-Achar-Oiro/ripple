// frontend/src/components/profile/ProfileTabs.js
const ProfileTabs = ({ activeTab, setActiveTab }) => {
    const tabs = [
      { id: 'posts', label: 'Posts' },
      { id: 'followers', label: 'Followers' },
      { id: 'following', label: 'Following' },
    ];
    
    return (
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-navy-600 text-navy-600'
                : 'text-gray-500 hover:text-navy-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };
  
  export default ProfileTabs;