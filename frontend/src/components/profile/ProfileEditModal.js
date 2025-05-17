// frontend/src/components/profile/ProfileEditModal.js
import { useState } from 'react';

const ProfileEditModal = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    nickname: user.nickname || '',
    aboutMe: user.aboutMe || '',
    isPublic: user.isPublic,
  });
  
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatarPath);
  
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState(user.coverPhotoPath);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCoverPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // In a real app, we'd create FormData for file uploads
    // For now, let's just pass the updated profile data
    const updatedProfile = {
      ...formData,
      avatarPath: avatarPreview,
      coverPhotoPath: coverPhotoPreview,
    };
    
    onSave(updatedProfile);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-navy-800 mb-4">Edit Profile</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Cover Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Photo
                </label>
                <div className="h-32 bg-gray-100 rounded-lg relative overflow-hidden">
                  {coverPhotoPreview && (
                    <img 
                      src={coverPhotoPreview} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white cursor-pointer hover:bg-opacity-50">
                    <span>Change Cover Photo</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleCoverPhotoChange}
                    />
                  </label>
                </div>
              </div>
              
              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center">
                  <div className="h-24 w-24 bg-navy-200 rounded-full overflow-hidden flex items-center justify-center text-navy-700 font-bold text-2xl">
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar preview" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <>
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </>
                    )}
                  </div>
                  <label className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    Choose file
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
              </div>
              
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-navy-500 focus:border-navy-500"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-navy-500 focus:border-navy-500"
                  />
                </div>
              </div>
              
              {/* Nickname */}
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
                  Nickname (optional)
                </label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  value={formData.nickname}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-navy-500 focus:border-navy-500"
                />
              </div>
              
              {/* About Me */}
              <div>
                <label htmlFor="aboutMe" className="block text-sm font-medium text-gray-700">
                  About me (optional)
                </label>
                <textarea
                  id="aboutMe"
                  name="aboutMe"
                  rows={4}
                  value={formData.aboutMe}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-navy-500 focus:border-navy-500"
                />
              </div>
              
              {/* Privacy Setting */}
              <div className="flex items-center">
                <input
                  id="isPublic"
                  name="isPublic"
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                  Public profile (anyone can see your profile)
                </label>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end mt-6 gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;