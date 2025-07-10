// backend/pkg/models/group.go
package models

import (
	"database/sql"
	"fmt"
	"ripple/pkg/constants"
	"strings"
	"time"
)

type GroupRepository struct {
	db *sql.DB
}

func NewGroupRepository(db *sql.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

type Group struct {
	ID          int       `json:"id" db:"id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	CreatorID   int       `json:"creator_id" db:"creator_id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	AvatarPath  *string   `json:"avatar_path" db:"avatar_path"`
	CoverPath   *string   `json:"cover_path" db:"cover_path"`

	// Joined fields
	Creator      *UserResponse `json:"creator,omitempty"`
	MemberCount  int           `json:"member_count"`
	IsCreator    bool          `json:"is_creator"`
	IsMember     bool          `json:"is_member"`
	MemberStatus string        `json:"member_status"` // "accepted", "pending", "not_member"
}

type GroupMember struct {
	BaseModel
	GroupID   int       `json:"group_id" db:"group_id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Status    string    `json:"status" db:"status"`
	InvitedBy *int      `json:"invited_by" db:"invited_by"`
	JoinedAt  time.Time `json:"joined_at" db:"joined_at"`

	// Joined fields
	User          *UserResponse `json:"user,omitempty"`
	InvitedByUser *UserResponse `json:"invited_by_user,omitempty"`
	Group         *Group        `json:"group,omitempty"`
}

type GroupPostComment struct {
	BaseModel
	GroupPostID int     `json:"group_post_id" db:"group_post_id"`
	UserID      int     `json:"user_id" db:"user_id"`
	Content     string  `json:"content" db:"content"`
	ImagePath   *string `json:"image_path" db:"image_path"`

	// Joined fields
	Author *UserResponse `json:"author,omitempty"`
}

type CreateGroupRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	AvatarPath  *string `json:"avatar_path"`
	CoverPath   *string `json:"cover_path"`
}

type InviteToGroupRequest struct {
	GroupID int   `json:"group_id"`
	UserIDs []int `json:"user_ids"`
}

type JoinGroupRequest struct {
	GroupID int `json:"group_id"`
}

type GroupActionRequest struct {
	MembershipID int    `json:"membership_id"`
	Action       string `json:"action"` // "accept" or "decline"
}

type CreateGroupPostRequest struct {
	Content   string  `json:"content"`
	ImagePath *string `json:"image_path"`
}

type CreateGroupCommentRequest struct {
	Content   string  `json:"content"`
	ImagePath *string `json:"image_path"`
}

type UpdateGroupRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	AvatarPath  *string `json:"avatar_path"`
	CoverPath   *string `json:"cover_path"`
}

// CreateGroup creates a new group
func (gr *GroupRepository) CreateGroup(creatorID int, req *CreateGroupRequest) (*Group, error) {
	// Validate input
	if strings.TrimSpace(req.Title) == "" {
		return nil, fmt.Errorf("group title is required")
	}

	tx, err := gr.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Create group
	query := `
		INSERT INTO groups (creator_id, title, description, avatar_path, cover_path, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	group := &Group{
		CreatorID:   creatorID,
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		AvatarPath:  req.AvatarPath,
		CoverPath:   req.CoverPath,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	err = tx.QueryRow(query,
		group.CreatorID,
		group.Title,
		group.Description,
		group.AvatarPath,
		group.CoverPath,
		group.CreatedAt,
		group.UpdatedAt,
	).Scan(&group.ID, &group.CreatedAt, &group.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create group: %w", err)
	}

	// Add creator as accepted member
	memberQuery := `
		INSERT INTO group_members (group_id, user_id, status, joined_at)
		VALUES (?, ?, ?, ?)
	`

	_, err = tx.Exec(memberQuery, group.ID, creatorID, constants.GroupMemberStatusAccepted, now)
	if err != nil {
		return nil, fmt.Errorf("failed to add creator as member: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return group, nil
}

// GetGroup gets a group by ID with membership info for viewer
func (gr *GroupRepository) GetGroup(groupID, viewerID int) (*Group, error) {
	query := `
		SELECT g.id, g.creator_id, g.title, g.description, g.avatar_path, g.cover_path, g.created_at, g.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = ?) as member_count
		FROM groups g
		JOIN users u ON g.creator_id = u.id
		WHERE g.id = ?
	`

	group := &Group{}
	creator := &User{}

	err := gr.db.QueryRow(query, constants.GroupMemberStatusAccepted, groupID).Scan(
		&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.AvatarPath, &group.CoverPath, &group.CreatedAt, &group.UpdatedAt,
		&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName, &creator.DateOfBirth, &creator.Nickname, &creator.AboutMe, &creator.AvatarPath, &creator.IsPublic, &creator.CreatedAt,
		&group.MemberCount,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("group not found")
		}
		return nil, fmt.Errorf("failed to get group: %w", err)
	}

	group.Creator = creator.ToResponse()
	group.IsCreator = group.CreatorID == viewerID

	// Get viewer's membership status
	status, err := gr.GetMembershipStatus(groupID, viewerID)
	if err != nil {
		return nil, fmt.Errorf("failed to check membership status: %w", err)
	}

	group.MemberStatus = status
	group.IsMember = status == constants.GroupMemberStatusAccepted

	return group, nil
}

// UpdateGroup updates an existing group
func (gr *GroupRepository) UpdateGroup(groupID, userID int, req *UpdateGroupRequest) (*Group, error) {
	// Validate input
	if strings.TrimSpace(req.Title) == "" {
		return nil, fmt.Errorf("group title is required")
	}

	// Check if user is the creator of the group
	isCreator, err := gr.IsCreator(groupID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check creator status: %w", err)
	}
	if !isCreator {
		return nil, fmt.Errorf("only group creator can update group information")
	}

	// Update group
	query := `
		UPDATE groups
		SET title = ?, description = ?, avatar_path = ?, cover_path = ?, updated_at = ?
		WHERE id = ?
	`

	now := time.Now()
	_, err = gr.db.Exec(query,
		strings.TrimSpace(req.Title),
		strings.TrimSpace(req.Description),
		req.AvatarPath,
		req.CoverPath,
		now,
		groupID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to update group: %w", err)
	}

	// Return updated group
	return gr.GetGroup(groupID, userID)
}

// GetAllGroups gets all groups (for browsing)
func (gr *GroupRepository) GetAllGroups(viewerID int, limit, offset int) ([]*Group, error) {
	query := `
		SELECT g.id, g.creator_id, g.title, g.description, g.avatar_path, g.cover_path, g.created_at, g.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = ?) as member_count
		FROM groups g
		JOIN users u ON g.creator_id = u.id
		ORDER BY g.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := gr.db.Query(query, constants.GroupMemberStatusAccepted, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get groups: %w", err)
	}
	defer rows.Close()

	var groups []*Group
	for rows.Next() {
		group := &Group{}
		creator := &User{}

		err := rows.Scan(
			&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.AvatarPath, &group.CoverPath, &group.CreatedAt, &group.UpdatedAt,
			&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName, &creator.DateOfBirth, &creator.Nickname, &creator.AboutMe, &creator.AvatarPath, &creator.IsPublic, &creator.CreatedAt,
			&group.MemberCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan group: %w", err)
		}

		group.Creator = creator.ToResponse()
		group.IsCreator = group.CreatorID == viewerID

		// Get viewer's membership status
		status, _ := gr.GetMembershipStatus(group.ID, viewerID)
		group.MemberStatus = status
		group.IsMember = status == constants.GroupMemberStatusAccepted

		groups = append(groups, group)
	}

	return groups, nil
}

// GetUserGroups gets groups that a user is a member of
func (gr *GroupRepository) GetUserGroups(userID int, limit, offset int) ([]*Group, error) {
	query := `
		SELECT g.id, g.creator_id, g.title, g.description, g.avatar_path, g.cover_path, g.created_at, g.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = ?) as member_count
		FROM groups g
		JOIN users u ON g.creator_id = u.id
		JOIN group_members gm ON g.id = gm.group_id
		WHERE gm.user_id = ? AND gm.status = ?
		ORDER BY gm.joined_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := gr.db.Query(query, constants.GroupMemberStatusAccepted, userID, constants.GroupMemberStatusAccepted, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get user groups: %w", err)
	}
	defer rows.Close()

	var groups []*Group
	for rows.Next() {
		group := &Group{}
		creator := &User{}

		err := rows.Scan(
			&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.AvatarPath, &group.CoverPath, &group.CreatedAt, &group.UpdatedAt,
			&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName, &creator.DateOfBirth, &creator.Nickname, &creator.AboutMe, &creator.AvatarPath, &creator.IsPublic, &creator.CreatedAt,
			&group.MemberCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan group: %w", err)
		}

		group.Creator = creator.ToResponse()
		group.IsCreator = group.CreatorID == userID
		group.MemberStatus = constants.GroupMemberStatusAccepted
		group.IsMember = true

		groups = append(groups, group)
	}

	return groups, nil
}

// SearchGroups searches for groups by title and description
func (gr *GroupRepository) SearchGroups(query string, viewerID int, limit, offset int) ([]*Group, error) {
	searchQuery := `
		SELECT g.id, g.creator_id, g.title, g.description, g.avatar_path, g.cover_path, g.created_at, g.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = ?) as member_count
		FROM groups g
		JOIN users u ON g.creator_id = u.id
		WHERE (g.title LIKE ? OR g.description LIKE ?)
		ORDER BY g.title, g.created_at DESC
		LIMIT ? OFFSET ?
	`

	searchTerm := "%" + strings.ToLower(query) + "%"
	rows, err := gr.db.Query(searchQuery, constants.GroupMemberStatusAccepted, searchTerm, searchTerm, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to search groups: %w", err)
	}
	defer rows.Close()

	var groups []*Group
	for rows.Next() {
		group := &Group{}
		creator := &User{}

		err := rows.Scan(
			&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.AvatarPath, &group.CoverPath, &group.CreatedAt, &group.UpdatedAt,
			&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName, &creator.DateOfBirth, &creator.Nickname, &creator.AboutMe, &creator.AvatarPath, &creator.IsPublic, &creator.CreatedAt,
			&group.MemberCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan group: %w", err)
		}

		group.Creator = creator.ToResponse()
		group.IsCreator = group.CreatorID == viewerID

		// Get membership status for viewer
		memberStatus, err := gr.GetMembershipStatus(group.ID, viewerID)
		if err != nil {
			return nil, fmt.Errorf("failed to get membership status: %w", err)
		}
		group.MemberStatus = memberStatus
		group.IsMember = memberStatus == constants.GroupMemberStatusAccepted

		groups = append(groups, group)
	}

	return groups, nil
}

// InviteUsersToGroup invites users to join a group and returns membership IDs
func (gr *GroupRepository) InviteUsersToGroup(groupID, inviterID int, userIDs []int) (map[int]int, error) {
	// Check if inviter is a member of the group
	isMember, err := gr.IsMember(groupID, inviterID)
	if err != nil {
		return nil, fmt.Errorf("failed to check membership: %w", err)
	}
	if !isMember {
		return nil, fmt.Errorf("only group members can invite others")
	}

	tx, err := gr.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	membershipIDs := make(map[int]int) // userID -> membershipID

	for _, userID := range userIDs {
		// Skip if user is already a member or has pending invitation
		exists, _ := gr.MembershipExists(groupID, userID)
		if exists {
			continue // Skip existing memberships
		}

		query := `
			INSERT INTO group_members (group_id, user_id, status, invited_by, joined_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`

		now := time.Now()
		result, err := tx.Exec(query, groupID, userID, constants.GroupMemberStatusPending, inviterID, now, now, now)
		if err != nil {
			return nil, fmt.Errorf("failed to create invitation: %w", err)
		}

		membershipID, err := result.LastInsertId()
		if err != nil {
			return nil, fmt.Errorf("failed to get membership ID: %w", err)
		}

		membershipIDs[userID] = int(membershipID)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return membershipIDs, nil
}

// RequestToJoinGroup creates a join request for a group and returns the membership ID
func (gr *GroupRepository) RequestToJoinGroup(groupID, userID int) (int, error) {
	// Check if user is already a member or has pending request
	exists, err := gr.MembershipExists(groupID, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to check membership: %w", err)
	}
	if exists {
		return 0, fmt.Errorf("user already has a membership or pending request")
	}

	query := `
		INSERT INTO group_members (group_id, user_id, status, joined_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	now := time.Now()
	result, err := gr.db.Exec(query, groupID, userID, constants.GroupMemberStatusPending, now, now, now)
	if err != nil {
		return 0, fmt.Errorf("failed to create join request: %w", err)
	}

	membershipID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to get membership ID: %w", err)
	}

	return int(membershipID), nil
}

// HandleMembershipRequest accepts or declines a membership request/invitation
func (gr *GroupRepository) HandleMembershipRequest(membershipID, userID int, action string) error {
	// Get membership details first
	var groupID, memberUserID, invitedBy sql.NullInt64
	var status string

	query := `SELECT group_id, user_id, invited_by, status FROM group_members WHERE id = ?`
	err := gr.db.QueryRow(query, membershipID).Scan(&groupID, &memberUserID, &invitedBy, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("membership request not found")
		}
		return fmt.Errorf("failed to get membership: %w", err)
	}

	// Check permissions
	if invitedBy.Valid {
		// This is an invitation - only the invited user can respond
		if int(memberUserID.Int64) != userID {
			return fmt.Errorf("only the invited user can respond to invitations")
		}
	} else {
		// This is a join request - only the group creator can respond
		isCreator, err := gr.IsCreator(int(groupID.Int64), userID)
		if err != nil {
			return fmt.Errorf("failed to check creator status: %w", err)
		}
		if !isCreator {
			return fmt.Errorf("only group creator can handle join requests")
		}
	}

	// Update membership status
	newStatus := constants.GroupMemberStatusDeclined
	if action == "accept" {
		newStatus = constants.GroupMemberStatusAccepted
	}

	updateQuery := `
		UPDATE group_members
		SET status = ?, joined_at = ?, updated_at = ?
		WHERE id = ? AND status = ?
	`

	now := time.Now()
	result, err := gr.db.Exec(updateQuery, newStatus, now, now, membershipID, constants.GroupMemberStatusPending)
	if err != nil {
		return fmt.Errorf("failed to update membership: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("membership request not found or already processed")
	}

	return nil
}

// GetGroupMembers gets accepted members of a group
func (gr *GroupRepository) GetGroupMembers(groupID int) ([]*GroupMember, error) {
	query := `
		SELECT gm.id, gm.group_id, gm.user_id, gm.status, gm.invited_by, gm.joined_at, gm.created_at, gm.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = ? AND gm.status = ?
		ORDER BY gm.joined_at ASC
	`

	rows, err := gr.db.Query(query, groupID, constants.GroupMemberStatusAccepted)
	if err != nil {
		return nil, fmt.Errorf("failed to get group members: %w", err)
	}
	defer rows.Close()

	var members []*GroupMember
	for rows.Next() {
		member := &GroupMember{}
		user := &User{}

		err := rows.Scan(
			&member.ID, &member.GroupID, &member.UserID, &member.Status, &member.InvitedBy, &member.JoinedAt, &member.CreatedAt, &member.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Nickname, &user.AboutMe, &user.AvatarPath, &user.IsPublic, &user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}

		member.User = user.ToResponse()
		members = append(members, member)
	}

	return members, nil
}

// GetPendingInvitations gets pending invitations for a user
func (gr *GroupRepository) GetPendingInvitations(userID int) ([]*GroupMember, error) {
	query := `
		SELECT gm.id, gm.group_id, gm.user_id, gm.status, gm.invited_by, gm.joined_at, gm.created_at, gm.updated_at,
		       g.id, g.title, g.description, g.avatar_path, g.cover_path, g.creator_id, g.created_at,
		       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = ?) as member_count
		FROM group_members gm
		JOIN groups g ON gm.group_id = g.id
		WHERE gm.user_id = ? AND gm.status = ? AND gm.invited_by IS NOT NULL
		ORDER BY gm.created_at DESC
	`

	rows, err := gr.db.Query(query, constants.GroupMemberStatusAccepted, userID, constants.GroupMemberStatusPending)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending invitations: %w", err)
	}
	defer rows.Close()

	var invitations []*GroupMember
	for rows.Next() {
		invitation := &GroupMember{}
		group := &Group{}
		var memberCount int

		err := rows.Scan(
			&invitation.ID, &invitation.GroupID, &invitation.UserID, &invitation.Status, &invitation.InvitedBy, &invitation.JoinedAt, &invitation.CreatedAt, &invitation.UpdatedAt,
			&group.ID, &group.Title, &group.Description, &group.AvatarPath, &group.CoverPath, &group.CreatorID, &group.CreatedAt,
			&memberCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan invitation: %w", err)
		}

		group.MemberCount = memberCount
		invitation.Group = group
		invitations = append(invitations, invitation)
	}

	return invitations, nil
}

// GetPendingJoinRequests gets pending join requests for a group (for creator)
func (gr *GroupRepository) GetPendingJoinRequests(groupID int) ([]*GroupMember, error) {
	query := `
		SELECT gm.id, gm.group_id, gm.user_id, gm.status, gm.invited_by, gm.joined_at, gm.created_at, gm.updated_at,
		       u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = ? AND gm.status = ? AND gm.invited_by IS NULL
		ORDER BY gm.created_at DESC
	`

	rows, err := gr.db.Query(query, groupID, constants.GroupMemberStatusPending)
	if err != nil {
		return nil, fmt.Errorf("failed to get join requests: %w", err)
	}
	defer rows.Close()

	var requests []*GroupMember
	for rows.Next() {
		request := &GroupMember{}
		user := &User{}

		err := rows.Scan(
			&request.ID, &request.GroupID, &request.UserID, &request.Status, &request.InvitedBy, &request.JoinedAt, &request.CreatedAt, &request.UpdatedAt,
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Nickname, &user.AboutMe, &user.AvatarPath, &user.IsPublic, &user.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan request: %w", err)
		}

		request.User = user.ToResponse()
		requests = append(requests, request)
	}

	return requests, nil
}

// Helper methods
func (gr *GroupRepository) IsMember(groupID, userID int) (bool, error) {
	var count int
	err := gr.db.QueryRow(`
		SELECT COUNT(*) FROM group_members 
		WHERE group_id = ? AND user_id = ? AND status = ?
	`, groupID, userID, constants.GroupMemberStatusAccepted).Scan(&count)

	return count > 0, err
}

func (gr *GroupRepository) IsCreator(groupID, userID int) (bool, error) {
	var count int
	err := gr.db.QueryRow(`
		SELECT COUNT(*) FROM groups 
		WHERE id = ? AND creator_id = ?
	`, groupID, userID).Scan(&count)

	return count > 0, err
}

func (gr *GroupRepository) MembershipExists(groupID, userID int) (bool, error) {
	var count int
	err := gr.db.QueryRow(`
		SELECT COUNT(*) FROM group_members 
		WHERE group_id = ? AND user_id = ?
	`, groupID, userID).Scan(&count)

	return count > 0, err
}

func (gr *GroupRepository) GetMembershipStatus(groupID, userID int) (string, error) {
	var status string
	err := gr.db.QueryRow(`
		SELECT status FROM group_members 
		WHERE group_id = ? AND user_id = ?
	`, groupID, userID).Scan(&status)

	if err != nil {
		if err == sql.ErrNoRows {
			return "not_member", nil
		}
		return "", err
	}

	return status, nil
}

// RemoveMemberFromGroup removes a user from a group
func (gr *GroupRepository) RemoveMemberFromGroup(groupID, userID int) error {
	// Check if user is the group creator
	isCreator, err := gr.IsCreator(groupID, userID)
	if err != nil {
		return fmt.Errorf("failed to check creator status: %w", err)
	}
	if isCreator {
		return fmt.Errorf("group creator cannot be removed from the group")
	}

	// Delete the membership record
	query := `
		DELETE FROM group_members 
		WHERE group_id = ? AND user_id = ?
	`

	result, err := gr.db.Exec(query, groupID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove member from group: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user is not a member of this group")
	}

	return nil
}

// GetRecommendedGroups gets intelligent group recommendations for a user
func (gr *GroupRepository) GetRecommendedGroups(userID int, limit int) ([]*GroupRecommendation, error) {
	// First, get groups where users that the current user follows are members
	followedUsersGroupsQuery := `
		SELECT
			g.id, g.creator_id, g.title, g.description, g.avatar_path, g.cover_path, g.created_at, g.updated_at,
			u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
			(SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = ?) as member_count,
			COUNT(DISTINCT gm.user_id) as followed_members_count
		FROM groups g
		JOIN users u ON g.creator_id = u.id
		JOIN group_members gm ON g.id = gm.group_id AND gm.status = ?
		JOIN follows f ON gm.user_id = f.following_id AND f.follower_id = ? AND f.status = ?
		WHERE g.id NOT IN (
			SELECT group_id FROM group_members WHERE user_id = ? AND status IN (?, ?)
		)
		GROUP BY g.id, g.creator_id, g.title, g.description, g.avatar_path, g.cover_path, g.created_at, g.updated_at,
				 u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at
		ORDER BY followed_members_count DESC, member_count DESC
		LIMIT ?
	`

	rows, err := gr.db.Query(followedUsersGroupsQuery,
		constants.GroupMemberStatusAccepted,
		constants.GroupMemberStatusAccepted,
		userID,
		constants.FollowStatusAccepted,
		userID,
		constants.GroupMemberStatusAccepted,
		constants.GroupMemberStatusPending,
		limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recommended groups from followed users: %w", err)
	}
	defer rows.Close()

	var recommendations []*GroupRecommendation
	for rows.Next() {
		group := &Group{}
		creator := &UserResponse{}
		var followedMembersCount int

		err := rows.Scan(
			&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.AvatarPath, &group.CoverPath, &group.CreatedAt, &group.UpdatedAt,
			&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName, &creator.DateOfBirth, &creator.Nickname, &creator.AboutMe, &creator.AvatarPath, &creator.IsPublic, &creator.CreatedAt,
			&group.MemberCount, &followedMembersCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan recommended group: %w", err)
		}

		group.Creator = creator
		recommendations = append(recommendations, &GroupRecommendation{
			Group:                group,
			FollowedMembersCount: followedMembersCount,
			RecommendationType:   "followed_users",
		})
	}

	// If we don't have enough recommendations, fill with popular groups
	if len(recommendations) < limit {
		remaining := limit - len(recommendations)

		// Get group IDs we already have
		excludeIDs := []string{}
		for _, rec := range recommendations {
			excludeIDs = append(excludeIDs, fmt.Sprintf("%d", rec.Group.ID))
		}

		excludeClause := ""
		if len(excludeIDs) > 0 {
			excludeClause = fmt.Sprintf("AND g.id NOT IN (%s)", strings.Join(excludeIDs, ","))
		}

		popularGroupsQuery := fmt.Sprintf(`
			SELECT
				g.id, g.creator_id, g.title, g.description, g.avatar_path, g.cover_path, g.created_at, g.updated_at,
				u.id, u.email, u.first_name, u.last_name, u.date_of_birth, u.nickname, u.about_me, u.avatar_path, u.is_public, u.created_at,
				(SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = ?) as member_count
			FROM groups g
			JOIN users u ON g.creator_id = u.id
			WHERE g.id NOT IN (
				SELECT group_id FROM group_members WHERE user_id = ? AND status IN (?, ?)
			) %s
			ORDER BY member_count DESC, g.created_at DESC
			LIMIT ?
		`, excludeClause)

		rows, err := gr.db.Query(popularGroupsQuery,
			constants.GroupMemberStatusAccepted,
			userID,
			constants.GroupMemberStatusAccepted,
			constants.GroupMemberStatusPending,
			remaining)
		if err != nil {
			return nil, fmt.Errorf("failed to get popular groups: %w", err)
		}
		defer rows.Close()

		for rows.Next() {
			group := &Group{}
			creator := &UserResponse{}

			err := rows.Scan(
				&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.AvatarPath, &group.CoverPath, &group.CreatedAt, &group.UpdatedAt,
				&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName, &creator.DateOfBirth, &creator.Nickname, &creator.AboutMe, &creator.AvatarPath, &creator.IsPublic, &creator.CreatedAt,
				&group.MemberCount,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to scan popular group: %w", err)
			}

			group.Creator = creator
			recommendations = append(recommendations, &GroupRecommendation{
				Group:                group,
				FollowedMembersCount: 0,
				RecommendationType:   "popular",
			})
		}
	}

	return recommendations, nil
}
