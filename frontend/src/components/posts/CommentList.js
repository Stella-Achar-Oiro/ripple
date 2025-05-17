// frontend/src/components/posts/CommentList.js
const CommentList = ({ comments }) => {
    // Format date to relative time
    const getRelativeTime = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) {
        return 'just now';
      }
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours}h`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) {
        return `${diffInDays}d`;
      }
      
      const diffInMonths = Math.floor(diffInDays / 30);
      return `${diffInMonths}mo`;
    };
    
    if (comments.length === 0) {
      return <div className="text-gray-500 text-sm text-center py-2">No comments yet</div>;
    }
    
    return (
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <div className="w-8 h-8 bg-navy-200 rounded-full flex items-center justify-center text-navy-700 font-bold text-xs">
              {comment.user.firstName.charAt(0)}{comment.user.lastName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="bg-gray-100 rounded-lg px-3 py-2">
                <div className="font-medium text-sm">{comment.user.firstName} {comment.user.lastName}</div>
                <div className="text-sm">{comment.content}</div>
              </div>
              <div className="text-xs text-gray-500 mt-1 ml-2">
                {getRelativeTime(comment.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  export default CommentList;