package router

import (
	"net/http"
	"strings"

	"ripple/pkg/handlers"
)

func setupFollowRoutes(mux *http.ServeMux, h *handlers.FollowHandler, auth func(http.Handler) http.Handler) {
	mux.Handle("/api/follow", auth(http.HandlerFunc(h.FollowUser)))
	mux.Handle("/api/unfollow", auth(http.HandlerFunc(h.UnfollowUser)))
	mux.Handle("/api/follow/handle", auth(http.HandlerFunc(h.HandleFollowRequest)))
	mux.Handle("/api/follow/requests", auth(http.HandlerFunc(h.GetFollowRequests)))
	mux.Handle("/api/follow/followers/", auth(http.HandlerFunc(h.GetFollowers)))
	mux.Handle("/api/follow/following/", auth(http.HandlerFunc(h.GetFollowing)))
	mux.Handle("/api/follow/stats/", auth(http.HandlerFunc(h.GetFollowStats)))
	mux.Handle("/api/follow/status/", auth(http.HandlerFunc(h.GetFollowStatus)))
}

func setupPostRoutes(mux *http.ServeMux, h *handlers.PostHandler, auth func(http.Handler) http.Handler) {
	mux.Handle("/api/posts", auth(http.HandlerFunc(h.CreatePost)))
	mux.Handle("/api/posts/", auth(http.HandlerFunc(h.GetPost)))
	mux.Handle("/api/posts/feed", auth(http.HandlerFunc(h.GetFeed)))
	mux.Handle("/api/posts/user/", auth(http.HandlerFunc(h.GetUserPosts)))
	mux.Handle("/api/posts/update", auth(http.HandlerFunc(h.UpdatePost)))
	mux.Handle("/api/posts/delete/", auth(http.HandlerFunc(h.DeletePost)))
	mux.Handle("/api/posts/comments/create", auth(http.HandlerFunc(h.CreateComment)))
	mux.Handle("/api/posts/comments/", auth(http.HandlerFunc(h.GetComments)))
}

func setupLikeRoutes(mux *http.ServeMux, h *handlers.LikeHandler, auth func(http.Handler) http.Handler) {
	mux.Handle("/api/posts/like", auth(http.HandlerFunc(h.ToggleLike)))
	// mux.Handle("/api/posts/like/", auth(http.HandlerFunc(h.LikePost)))
	// mux.Handle("/api/posts/unlike/", auth(http.HandlerFunc(h.UnlikePost)))
	// mux.Handle("/api/posts/likes/", auth(http.HandlerFunc(h.GetPostLikes)))
	// mux.Handle("/api/posts/like-status/", auth(http.HandlerFunc(h.CheckLikeStatus)))
}

func setupGroupRoutes(mux *http.ServeMux, h *handlers.GroupHandler, auth func(http.Handler) http.Handler) {
	mux.Handle("/api/groups", auth(http.HandlerFunc(h.CreateGroup)))
	mux.Handle("/api/groups/all", auth(http.HandlerFunc(h.GetAllGroups)))
	mux.Handle("/api/groups/user", auth(http.HandlerFunc(h.GetUserGroups)))
	mux.Handle("/api/groups/invite", auth(http.HandlerFunc(h.InviteToGroup)))
	mux.Handle("/api/groups/join", auth(http.HandlerFunc(h.JoinGroup)))
	mux.Handle("/api/groups/handle", auth(http.HandlerFunc(h.HandleMembershipRequest)))
	mux.Handle("/api/groups/leave/", auth(http.HandlerFunc(h.LeaveGroup)))
	mux.Handle("/api/groups/posts/update", auth(http.HandlerFunc(h.UpdateGroupPost)))
	mux.Handle("/api/groups/posts/delete/", auth(http.HandlerFunc(h.DeleteGroupPost)))

	mux.Handle("/api/groups/invitations", auth(http.HandlerFunc(h.GetPendingInvitations)))
	// Handle group requests endpoint with proper routing
	mux.HandleFunc("/api/groups/", func(w http.ResponseWriter, r *http.Request) {
		authHandler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasSuffix(r.URL.Path, "/requests") && r.Method == "GET" {
				h.GetPendingJoinRequests(w, r)
			} else if strings.HasSuffix(r.URL.Path, "/invite") && r.Method == "POST" {
				h.InviteUsers(w, r)
			} else if strings.HasSuffix(r.URL.Path, "/members") && r.Method == "GET" {
				h.GetGroupMembers(w, r)
			} else if r.Method == "PUT" {
				h.UpdateGroup(w, r)
			} else {
				h.GetGroup(w, r)
			}
		}))
		authHandler.ServeHTTP(w, r)
	})
	mux.Handle("/api/groups/posts/", auth(http.HandlerFunc(h.CreateGroupPost)))
	mux.Handle("/api/groups/posts/get/", auth(http.HandlerFunc(h.GetGroupPosts)))
	mux.Handle("/api/groups/comments/", auth(http.HandlerFunc(h.CreateGroupComment)))
	mux.Handle("/api/groups/comments/get/", auth(http.HandlerFunc(h.GetGroupComments)))
	mux.Handle("/api/groups/posts/like", auth(http.HandlerFunc(h.ToggleGroupPostLike)))
}

func setupEventRoutes(mux *http.ServeMux, h *handlers.EventHandler, auth func(http.Handler) http.Handler) {
	mux.Handle("/api/events", auth(http.HandlerFunc(h.GetUserEvents)))
	mux.Handle("/api/events/", auth(http.HandlerFunc(h.CreateEvent)))
	mux.Handle("/api/events/get/", auth(http.HandlerFunc(h.GetEvent)))
	mux.Handle("/api/events/group/", auth(http.HandlerFunc(h.GetGroupEvents)))
	mux.Handle("/api/events/respond/", auth(http.HandlerFunc(h.RespondToEvent)))
	mux.Handle("/api/events/responses/", auth(http.HandlerFunc(h.GetEventResponses)))
}

func setupUploadRoutes(mux *http.ServeMux, h *handlers.UploadHandler, auth func(http.Handler) http.Handler) {
	mux.Handle("/api/upload/avatar", auth(http.HandlerFunc(h.UploadAvatar)))
	mux.Handle("/api/upload/cover", auth(http.HandlerFunc(h.UploadCover)))
	mux.Handle("/api/upload/post", auth(http.HandlerFunc(h.UploadPostImage)))
	mux.Handle("/api/upload/comment", auth(http.HandlerFunc(h.UploadCommentImage)))
	mux.Handle("/api/upload/group-avatar", auth(http.HandlerFunc(h.UploadGroupAvatar)))
	mux.Handle("/api/upload/group-cover", auth(http.HandlerFunc(h.UploadGroupCover)))
}

func setupNotificationRoutes(mux *http.ServeMux, h *handlers.NotificationHandler, auth func(http.Handler) http.Handler) {
	mux.Handle("/api/notifications", auth(http.HandlerFunc(h.GetNotifications)))
	mux.Handle("/api/notifications/read/", auth(http.HandlerFunc(h.MarkAsRead)))
	mux.Handle("/api/notifications/read-all", auth(http.HandlerFunc(h.MarkAllAsRead)))
	mux.Handle("/api/notifications/delete/", auth(http.HandlerFunc(h.DeleteNotification)))
}

func setupChatRoutes(mux *http.ServeMux, h *handlers.ChatHandler, auth func(http.Handler) http.Handler) {
	mux.Handle("/api/chat/conversations", auth(http.HandlerFunc(h.GetConversations)))
	mux.Handle("/api/chat/messages/private/", auth(http.HandlerFunc(h.GetPrivateMessages)))
	mux.Handle("/api/chat/messages/group/", auth(http.HandlerFunc(h.GetGroupMessages)))
	mux.Handle("/api/chat/messages/private", auth(http.HandlerFunc(h.CreatePrivateMessage)))
	mux.Handle("/api/chat/messages/group", auth(http.HandlerFunc(h.CreateGroupMessage)))
	mux.Handle("/api/chat/online", auth(http.HandlerFunc(h.GetOnlineUsers)))
	mux.Handle("/api/chat/typing", auth(http.HandlerFunc(h.TypingIndicator)))
	mux.Handle("/api/chat/unread", auth(http.HandlerFunc(h.GetUnreadCounts)))
}
