package models

import (
	"encoding/json"
	"strings"
	"time"
)

const (
	CommunityCategoryBuildLog        = "build-log"
	CommunityCategoryFirstStart      = "first-start"
	CommunityCategoryModsUpgrades    = "mods-upgrades"
	CommunityCategoryTroubleshooting = "troubleshooting"
	CommunityCategoryShowTell        = "show-tell"

	CommunityStatusPublished = "published"
	CommunityStatusPending   = "pending"
	CommunityStatusHidden    = "hidden"
)

var ValidCommunityCategories = map[string]bool{
	CommunityCategoryBuildLog:        true,
	CommunityCategoryFirstStart:      true,
	CommunityCategoryModsUpgrades:    true,
	CommunityCategoryTroubleshooting: true,
	CommunityCategoryShowTell:        true,
}

// CommunityPost represents a builder showcase thread or forum discussion.
type CommunityPost struct {
	ID             uint               `json:"id" gorm:"primaryKey"`
	Slug           string             `json:"slug" gorm:"size:255;uniqueIndex;not null"`
	Title          string             `json:"title" gorm:"size:255;not null"`
	Excerpt        string             `json:"excerpt" gorm:"type:text"`
	Body           string             `json:"body" gorm:"type:longtext;not null"`
	Category       string             `json:"category" gorm:"size:40;not null;default:build-log;index"`
	Tags           string             `json:"tags" gorm:"size:500"`
	AuthorName     string             `json:"author_name" gorm:"size:120;not null"`
	AuthorEmail    string             `json:"-" gorm:"size:255"`
	AuthorLocation string             `json:"author_location" gorm:"size:120"`
	AuthorBadge    string             `json:"author_badge" gorm:"size:60"`
	CustomerID     *uint              `json:"customer_id,omitempty" gorm:"index"`
	Images         string             `json:"-" gorm:"type:json"`
	ImageURLs      []string           `json:"image_urls" gorm:"-"`
	TagList        []string           `json:"tag_list" gorm:"-"`
	VideoURL       string             `json:"video_url" gorm:"size:500"`
	ProductSlug    string             `json:"product_slug" gorm:"size:255"`
	ProductName    string             `json:"product_name" gorm:"size:255"`
	BuildHours     string             `json:"build_hours" gorm:"size:60"`
	Difficulty     string             `json:"difficulty" gorm:"size:40"`
	Status         string             `json:"status" gorm:"size:20;not null;default:published;index"`
	IsPinned       bool               `json:"is_pinned" gorm:"default:false;index"`
	IsFeatured     bool               `json:"is_featured" gorm:"default:false;index"`
	LikesCount     int                `json:"likes_count" gorm:"default:0"`
	ViewsCount     int                `json:"views_count" gorm:"default:0"`
	CommentsCount  int                `json:"comments_count" gorm:"default:0"`
	CreatedAt      time.Time          `json:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at"`
	Comments       []CommunityComment `json:"comments,omitempty" gorm:"foreignKey:PostID"`
}

func (CommunityPost) TableName() string { return "community_posts" }

// HydrateComputed populates JSON-friendly slice fields from stored strings.
func (p *CommunityPost) HydrateComputed() {
	p.ImageURLs = []string{}
	if strings.TrimSpace(p.Images) != "" {
		var urls []string
		if err := json.Unmarshal([]byte(p.Images), &urls); err == nil {
			for _, u := range urls {
				if trimmed := strings.TrimSpace(u); trimmed != "" {
					p.ImageURLs = append(p.ImageURLs, trimmed)
				}
			}
		}
	}
	p.TagList = []string{}
	if strings.TrimSpace(p.Tags) != "" {
		for _, part := range strings.Split(p.Tags, ",") {
			if cleaned := strings.TrimSpace(part); cleaned != "" {
				p.TagList = append(p.TagList, cleaned)
			}
		}
	}
}

// CommunityComment represents a reply on a builder showcase thread.
type CommunityComment struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	PostID      uint      `json:"post_id" gorm:"not null;index"`
	ParentID    *uint     `json:"parent_id,omitempty" gorm:"index"`
	AuthorName  string    `json:"author_name" gorm:"size:120;not null"`
	AuthorEmail string    `json:"-" gorm:"size:255"`
	AuthorBadge string    `json:"author_badge" gorm:"size:60"`
	CustomerID  *uint     `json:"customer_id,omitempty" gorm:"index"`
	Body        string    `json:"body" gorm:"type:text;not null"`
	Status      string    `json:"status" gorm:"size:20;not null;default:published;index"`
	LikesCount  int       `json:"likes_count" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (CommunityComment) TableName() string { return "community_comments" }
