# Follow/Unfollow Functionality

## Overview
Comprehensive follow/unfollow system with support for private users, follow requests, and dynamic UI updates.

## Components Created

### 1. FollowButton (`components/Social/FollowButton.js`)
Reusable follow button component that handles all follow scenarios.

#### Features:
- ✅ Follow/Unfollow public users
- ✅ Send follow requests to private users  
- ✅ Cancel pending requests
- ✅ Multiple size and style variants
- ✅ Real-time status updates
- ✅ Loading states and error handling
- ✅ Dynamic follower count updates

#### Usage:
```jsx
import FollowButton from '../Social/FollowButton'

<FollowButton
  userId="user123"
  initialFollowStatus="following" // null, 'following', 'pending'
  isPrivateUser={false}
  size="medium" // 'small', 'medium', 'large'
  variant="primary" // 'primary', 'outline', 'minimal'
  onFollowChange={handleFollowChange}
  className="custom-class"
  disabled={false}
/>
```

#### Props:
- `userId` (required): Target user ID
- `initialFollowStatus`: Initial follow state
- `isPrivateUser`: Whether target user is private
- `size`: Button size variant
- `variant`: Button style variant
- `onFollowChange`: Callback when follow status changes
- `className`: Additional CSS classes
- `disabled`: Disable button interactions

### 2. FollowRequests (`components/Social/FollowRequests.js`)
Component for managing incoming follow requests.

#### Features:
- ✅ List pending follow requests
- ✅ Accept/decline requests
- ✅ Widget and full-page modes
- ✅ Real-time request updates
- ✅ Loading and error states

#### Usage:
```jsx
import FollowRequests from '../Social/FollowRequests'

// As a widget
<FollowRequests 
  showAsWidget={true}
  limit={3}
  onRequestChange={handleRequestChange}
/>

// As full page component
<FollowRequests 
  showAsWidget={false}
  onRequestChange={handleRequestChange}
/>
```

#### Props:
- `showAsWidget`: Display as widget or full component
- `limit`: Maximum requests to show (widget mode)
- `onRequestChange`: Callback when requests are handled

## Updated Components

### 1. ProfileHeader
- ✅ Replaced old follow button with new FollowButton
- ✅ Dynamic follower count updates
- ✅ Support for private user follow requests

### 2. UserCard (Search Results)
- ✅ Integrated new FollowButton
- ✅ Smaller size variant for compact display
- ✅ Prevented event bubbling on follow actions

## API Integration

### Backend Endpoints (Existing Pattern):

1. **Follow User**
   ```
   POST /api/follows/{userId}/follow
   Headers: credentials: 'include' (cookie-based auth)
   Response: { success: true }
   ```

2. **Unfollow User**
   ```
   POST /api/follows/{userId}/unfollow
   Headers: credentials: 'include' (cookie-based auth)
   Response: { success: true }
   ```

3. **Get Follow Status** (Optional - for future enhancement)
   ```
   GET /api/follows/status/{userId}
   Response: { data: { status: "following|pending|null" } }
   ```

4. **Get Follow Requests** (Need to implement)
   ```
   GET /api/follows/requests
   Response: { 
     data: { 
       requests: [
         {
           id: "string",
           user: { id, first_name, last_name, avatar_path, about_me, email },
           created_at: "date"
         }
       ]
     }
   }
   ```

5. **Handle Follow Request** (Need to implement)
   ```
   POST /api/follows/handle
   Body: { requestId: "string", action: "accept|decline" }
   Response: { data: { success: true } }
   ```

### API Integration Notes:
- Uses existing `/api/follows/` endpoint pattern
- Cookie-based authentication with `credentials: 'include'`
- User ID passed in URL path, not request body

## Follow Status States

- `null`: Not following
- `"following"`: Currently following  
- `"pending"`: Follow request sent (private user)
- `"requested"`: Alternative to pending

## UI States & Behaviors

### Follow Button States:
1. **Not Following**: "Follow" with plus icon
2. **Following**: "Following" with check icon
3. **Pending Request**: "Requested" with clock icon
4. **Loading**: Spinner with action text

### Interactive Behaviors:
- **Follow → Unfollow**: Hover shows unfollow hint
- **Pending → Cancel**: Hover shows cancel hint
- **Private Users**: Automatically sends request instead of following
- **Error States**: Shows retry button with error info

## Styling & Variants

### Size Variants:
- **Small**: 32px height, compact for lists
- **Medium**: 40px height, standard size
- **Large**: 48px height, prominent placement

### Style Variants:
- **Primary**: Purple gradient background
- **Outline**: Transparent with purple border
- **Minimal**: Subtle border, minimal styling

### Responsive Design:
- Mobile optimizations for smaller screens
- Touch-friendly button sizes
- Icon-only mode for very small spaces

## Usage Examples

### Profile Page:
```jsx
<FollowButton
  userId={profile.id}
  initialFollowStatus={profile.is_following ? 'following' : null}
  isPrivateUser={!profile.is_public}
  size="large"
  variant="primary"
  onFollowChange={updateFollowerCount}
/>
```

### Search Results:
```jsx
<FollowButton
  userId={user.id}
  initialFollowStatus={user.is_following ? 'following' : null}
  isPrivateUser={user.is_public === false}
  size="small"
  variant="outline"
/>
```

### User List Widget:
```jsx
<FollowButton
  userId={user.id}
  size="small"
  variant="minimal"
  className="compact"
/>
```

### Follow Requests Widget:
```jsx
<FollowRequests 
  showAsWidget={true}
  limit={3}
  onRequestChange={({ remainingCount }) => {
    updateNotificationCount(remainingCount)
  }}
/>
```

## Implementation Benefits

1. **Consistency**: Single component for all follow interactions
2. **Flexibility**: Multiple size and style variants
3. **Accessibility**: Proper ARIA labels and keyboard support
4. **Performance**: Optimized with proper state management
5. **UX**: Smooth animations and loading states
6. **Maintainability**: Centralized follow logic
7. **Privacy**: Proper handling of private user workflows

## Next Steps

1. **Backend Integration**: Implement the required API endpoints
2. **Notifications**: Add follow request notifications to navbar
3. **Analytics**: Track follow/unfollow events
4. **Testing**: Comprehensive testing of all follow scenarios
5. **Performance**: Add optimistic updates for better UX