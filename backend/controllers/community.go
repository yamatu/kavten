package controllers

import (
	"encoding/json"
	"errors"
	"kavten-backend/config"
	"kavten-backend/models"
	"kavten-backend/services"
	"kavten-backend/utils"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CommunityController struct{}

type CreateCommunityPostRequest struct {
	Title          string   `json:"title"`
	Body           string   `json:"body"`
	Category       string   `json:"category"`
	Tags           []string `json:"tags"`
	AuthorName     string   `json:"author_name"`
	AuthorEmail    string   `json:"author_email"`
	AuthorLocation string   `json:"author_location"`
	ImageURLs      []string `json:"image_urls"`
	VideoURL       string   `json:"video_url"`
	ProductSlug    string   `json:"product_slug"`
	ProductName    string   `json:"product_name"`
	BuildHours     string   `json:"build_hours"`
	Difficulty     string   `json:"difficulty"`
	TurnstileToken string   `json:"turnstile_token"`
}

type CreateCommunityCommentRequest struct {
	AuthorName     string `json:"author_name"`
	AuthorEmail    string `json:"author_email"`
	Body           string `json:"body"`
	ParentID       *uint  `json:"parent_id"`
	TurnstileToken string `json:"turnstile_token"`
}

type AdminUpdateCommunityPostRequest struct {
	Title      *string `json:"title"`
	Category   *string `json:"category"`
	Status     *string `json:"status"`
	IsPinned   *bool   `json:"is_pinned"`
	IsFeatured *bool   `json:"is_featured"`
}

type AdminUpdateCommunityCommentRequest struct {
	Status *string `json:"status"`
}

func normalizeCommunityCategory(raw string) string {
	v := strings.ToLower(strings.TrimSpace(raw))
	if models.ValidCommunityCategories[v] {
		return v
	}
	return models.CommunityCategoryBuildLog
}

// verifyCommunityHuman runs Turnstile only when an administrator has enabled it.
// Guests write to a public forum, so the check is shared by posts and replies and
// never blocks a deployment that has not configured captcha keys yet.
func verifyCommunityHuman(c *gin.Context, db *gorm.DB, token string) bool {
	err := services.VerifyTurnstileIfEnabled(c.Request.Context(), db, token, c.ClientIP())
	if err == nil {
		return true
	}
	if errors.Is(err, services.ErrTurnstileMissingToken) || errors.Is(err, services.ErrTurnstileRejected) {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Human verification failed, please try again", Error: "captcha_failed"})
		return false
	}
	c.JSON(http.StatusServiceUnavailable, models.APIResponse{Success: false, Message: "Human verification is temporarily unavailable", Error: utils.PublicError(err, "captcha_unavailable")})
	return false
}

func normalizeCommunityDifficulty(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "beginner":
		return "Beginner"
	case "intermediate":
		return "Intermediate"
	case "advanced":
		return "Advanced"
	default:
		return ""
	}
}

func sanitizeCommunityImageURLs(raw []string) []string {
	out := make([]string, 0, len(raw))
	seen := make(map[string]bool)
	for _, item := range raw {
		u := strings.TrimSpace(item)
		if u == "" || len(u) > 600 || seen[u] {
			continue
		}
		if strings.HasPrefix(u, "/uploads/") || strings.HasPrefix(u, "/images/") {
			seen[u] = true
			out = append(out, u)
		} else if parsed, err := url.Parse(u); err == nil && (parsed.Scheme == "https" || parsed.Scheme == "http") && parsed.Host != "" {
			seen[u] = true
			out = append(out, parsed.String())
		}
		if len(out) >= 6 {
			break
		}
	}
	return out
}

func sanitizeCommunityVideoURL(raw string) string {
	u := strings.TrimSpace(raw)
	if u == "" || len(u) > 400 {
		return ""
	}
	parsed, err := url.Parse(u)
	if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		return ""
	}
	host := strings.ToLower(parsed.Hostname())
	allowedHosts := []string{"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com"}
	for _, h := range allowedHosts {
		if host == h {
			return parsed.String()
		}
	}
	return ""
}

func sanitizeCommunityTags(tags []string) string {
	out := make([]string, 0, len(tags))
	seen := make(map[string]bool)
	for _, tag := range tags {
		cleaned := strings.TrimSpace(strings.ReplaceAll(tag, ",", " "))
		cleaned = strings.TrimPrefix(cleaned, "#")
		if cleaned == "" || utf8.RuneCountInString(cleaned) > 32 {
			continue
		}
		key := strings.ToLower(cleaned)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, cleaned)
		if len(out) >= 6 {
			break
		}
	}
	return strings.Join(out, ",")
}

func makeCommunityExcerpt(body string, maxRunes int) string {
	cleaned := strings.ReplaceAll(body, "\r\n", "\n")
	cleaned = strings.Join(strings.Fields(cleaned), " ")
	cleaned = strings.TrimSpace(cleaned)
	runes := []rune(cleaned)
	if len(runes) <= maxRunes {
		return cleaned
	}
	return strings.TrimSpace(string(runes[:maxRunes])) + "..."
}

func ensureUniqueCommunitySlug(db *gorm.DB, base string) string {
	slug := slugify(base)
	// "share" and "article" are real routes under /community, and a thread that
	// collides with one of them would be unreachable even though it published.
	if slug == "share" || slug == "article" {
		slug = slug + "-thread"
	}
	if len(slug) > 90 {
		slug = strings.Trim(slug[:90], "-")
	}
	candidate := slug
	suffix := 1
	for {
		var count int64
		db.Model(&models.CommunityPost{}).Where("slug = ?", candidate).Count(&count)
		if count == 0 {
			return candidate
		}
		suffix++
		candidate = slug + "-" + strconv.Itoa(suffix)
	}
}

func (ctrl *CommunityController) GetPublicPosts(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, models.APIResponse{Success: false, Message: "Community temporarily unavailable"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "12"))
	if pageSize < 1 {
		pageSize = 12
	}
	if pageSize > 50 {
		pageSize = 50
	}

	category := strings.ToLower(strings.TrimSpace(c.Query("category")))
	search := strings.TrimSpace(c.Query("search"))
	sortBy := strings.ToLower(strings.TrimSpace(c.DefaultQuery("sort", "latest")))
	featuredOnly := strings.ToLower(strings.TrimSpace(c.Query("featured"))) == "true"

	query := db.Model(&models.CommunityPost{}).Where("status = ?", models.CommunityStatusPublished)
	if category != "" && category != "all" && models.ValidCommunityCategories[category] {
		query = query.Where("category = ?", category)
	}
	if featuredOnly {
		query = query.Where("is_featured = ?", true)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("title LIKE ? OR body LIKE ? OR tags LIKE ? OR product_name LIKE ? OR author_name LIKE ?", like, like, like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to count community posts"})
		return
	}

	orderClause := "is_pinned DESC, created_at DESC"
	switch sortBy {
	case "popular", "likes":
		orderClause = "is_pinned DESC, likes_count DESC, created_at DESC"
	case "discussed", "comments":
		orderClause = "is_pinned DESC, comments_count DESC, created_at DESC"
	}

	// Start from an empty slice, not a nil one: `Find` leaves nil untouched when
	// nothing matches, and `null` for a list makes every client guard it.
	posts := make([]models.CommunityPost, 0, pageSize)
	offset := (page - 1) * pageSize
	if err := query.Order(orderClause).Offset(offset).Limit(pageSize).Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load community posts"})
		return
	}
	for i := range posts {
		posts[i].HydrateComputed()
	}

	// Aggregate category counts across all published posts for the filter bar
	type catCountRow struct {
		Category string
		Count    int64
	}
	var catRows []catCountRow
	db.Model(&models.CommunityPost{}).
		Select("category, COUNT(*) as count").
		Where("status = ?", models.CommunityStatusPublished).
		Group("category").
		Scan(&catRows)
	categoryCounts := map[string]int64{}
	var allPublishedPosts int64
	for _, row := range catRows {
		categoryCounts[row.Category] = row.Count
		allPublishedPosts += row.Count
	}
	var allPublishedComments int64
	db.Model(&models.CommunityComment{}).Where("status = ?", models.CommunityStatusPublished).Count(&allPublishedComments)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"data":        posts,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
			"stats": gin.H{
				"total_posts":    allPublishedPosts,
				"total_comments": allPublishedComments,
				"categories":     categoryCounts,
			},
		},
	})
}

func (ctrl *CommunityController) GetPublicPostBySlug(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, models.APIResponse{Success: false, Message: "Community temporarily unavailable"})
		return
	}

	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid post slug"})
		return
	}

	var post models.CommunityPost
	if err := db.Where("slug = ? AND status = ?", slug, models.CommunityStatusPublished).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Thread not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load thread"})
		return
	}

	comments := make([]models.CommunityComment, 0, 8)
	db.Where("post_id = ? AND status = ?", post.ID, models.CommunityStatusPublished).
		Order("created_at ASC").
		Find(&comments)
	post.Comments = comments
	post.HydrateComputed()

	// Increment views without blocking response
	db.Model(&models.CommunityPost{}).Where("id = ?", post.ID).UpdateColumn("views_count", gorm.Expr("views_count + 1"))
	post.ViewsCount++

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    post,
	})
}

func (ctrl *CommunityController) CreatePublicPost(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, models.APIResponse{Success: false, Message: "Community temporarily unavailable"})
		return
	}

	var req CreateCommunityPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}
	if !verifyCommunityHuman(c, db, req.TurnstileToken) {
		return
	}

	title := strings.TrimSpace(req.Title)
	body := strings.TrimSpace(req.Body)
	authorName := strings.TrimSpace(req.AuthorName)
	authorEmail := strings.TrimSpace(req.AuthorEmail)
	authorLocation := strings.TrimSpace(req.AuthorLocation)
	authorBadge := "Builder"

	var customerID *uint
	if cidVal, exists := c.Get("customer_id"); exists {
		if cid, ok := cidVal.(uint); ok && cid > 0 {
			customerID = &cid
			var customer models.Customer
			if err := db.First(&customer, cid).Error; err == nil {
				if authorName == "" {
					authorName = strings.TrimSpace(customer.FullName)
				}
				if authorEmail == "" {
					authorEmail = customer.Email
				}
				var orderCount int64
				db.Model(&models.Order{}).Where("customer_id = ?", cid).Count(&orderCount)
				if orderCount > 0 {
					authorBadge = "Verified Builder"
				} else {
					authorBadge = "Community Member"
				}
			}
		}
	}

	if utf8.RuneCountInString(title) < 5 || utf8.RuneCountInString(title) > 180 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Title must be between 5 and 180 characters"})
		return
	}
	if utf8.RuneCountInString(body) < 20 || utf8.RuneCountInString(body) > 12000 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Post details must be between 20 and 12,000 characters"})
		return
	}
	if utf8.RuneCountInString(authorName) < 2 || utf8.RuneCountInString(authorName) > 80 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Please enter a display name (2 to 80 characters)"})
		return
	}
	if utf8.RuneCountInString(authorLocation) > 80 {
		authorLocation = string([]rune(authorLocation)[:80])
	}

	imageURLs := sanitizeCommunityImageURLs(req.ImageURLs)
	imagesJSON, _ := json.Marshal(imageURLs)

	post := models.CommunityPost{
		Slug:           ensureUniqueCommunitySlug(db, title),
		Title:          title,
		Excerpt:        makeCommunityExcerpt(body, 220),
		Body:           body,
		Category:       normalizeCommunityCategory(req.Category),
		Tags:           sanitizeCommunityTags(req.Tags),
		AuthorName:     authorName,
		AuthorEmail:    authorEmail,
		AuthorLocation: authorLocation,
		AuthorBadge:    authorBadge,
		CustomerID:     customerID,
		Images:         string(imagesJSON),
		VideoURL:       sanitizeCommunityVideoURL(req.VideoURL),
		ProductSlug:    strings.TrimSpace(req.ProductSlug),
		ProductName:    strings.TrimSpace(req.ProductName),
		BuildHours:     strings.TrimSpace(req.BuildHours),
		Difficulty:     normalizeCommunityDifficulty(req.Difficulty),
		Status:         models.CommunityStatusPublished,
	}

	if err := db.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to publish thread"})
		return
	}
	post.HydrateComputed()

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Your build post is live!",
		Data:    post,
	})
}

func (ctrl *CommunityController) CreatePublicComment(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, models.APIResponse{Success: false, Message: "Community temporarily unavailable"})
		return
	}

	slug := strings.TrimSpace(c.Param("slug"))
	var post models.CommunityPost
	if err := db.Where("slug = ? AND status = ?", slug, models.CommunityStatusPublished).First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Thread not found"})
		return
	}

	var req CreateCommunityCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}
	if !verifyCommunityHuman(c, db, req.TurnstileToken) {
		return
	}

	body := strings.TrimSpace(req.Body)
	authorName := strings.TrimSpace(req.AuthorName)
	authorEmail := strings.TrimSpace(req.AuthorEmail)
	authorBadge := "Builder"

	var customerID *uint
	if cidVal, exists := c.Get("customer_id"); exists {
		if cid, ok := cidVal.(uint); ok && cid > 0 {
			customerID = &cid
			var customer models.Customer
			if err := db.First(&customer, cid).Error; err == nil {
				if authorName == "" {
					authorName = strings.TrimSpace(customer.FullName)
				}
				if authorEmail == "" {
					authorEmail = customer.Email
				}
				authorBadge = "Community Member"
			}
		}
	}

	if utf8.RuneCountInString(body) < 2 || utf8.RuneCountInString(body) > 4000 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Reply must be between 2 and 4,000 characters"})
		return
	}
	if utf8.RuneCountInString(authorName) < 2 || utf8.RuneCountInString(authorName) > 80 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Please enter a display name (2 to 80 characters)"})
		return
	}

	var parentID *uint
	if req.ParentID != nil && *req.ParentID > 0 {
		var parent models.CommunityComment
		if err := db.Where("id = ? AND post_id = ?", *req.ParentID, post.ID).First(&parent).Error; err == nil {
			parentID = &parent.ID
		}
	}

	comment := models.CommunityComment{
		PostID:      post.ID,
		ParentID:    parentID,
		AuthorName:  authorName,
		AuthorEmail: authorEmail,
		AuthorBadge: authorBadge,
		CustomerID:  customerID,
		Body:        body,
		Status:      models.CommunityStatusPublished,
	}

	if err := db.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to post reply"})
		return
	}

	db.Model(&models.CommunityPost{}).Where("id = ?", post.ID).UpdateColumn("comments_count", gorm.Expr("comments_count + 1"))

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Reply posted",
		Data:    comment,
	})
}

func (ctrl *CommunityController) LikePublicPost(c *gin.Context) {
	db := config.GetDB()
	slug := strings.TrimSpace(c.Param("slug"))
	var post models.CommunityPost
	if err := db.Where("slug = ? AND status = ?", slug, models.CommunityStatusPublished).First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Thread not found"})
		return
	}
	db.Model(&models.CommunityPost{}).Where("id = ?", post.ID).UpdateColumn("likes_count", gorm.Expr("likes_count + 1"))
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    gin.H{"likes_count": post.LikesCount + 1},
	})
}

func (ctrl *CommunityController) LikePublicComment(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid comment id"})
		return
	}
	var comment models.CommunityComment
	if err := db.Where("id = ? AND status = ?", id, models.CommunityStatusPublished).First(&comment).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Comment not found"})
		return
	}
	db.Model(&models.CommunityComment{}).Where("id = ?", comment.ID).UpdateColumn("likes_count", gorm.Expr("likes_count + 1"))
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    gin.H{"likes_count": comment.LikesCount + 1},
	})
}

func (ctrl *CommunityController) AdminListPosts(c *gin.Context) {
	db := config.GetDB()
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	status := strings.TrimSpace(c.Query("status"))
	search := strings.TrimSpace(c.Query("search"))

	query := db.Model(&models.CommunityPost{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("title LIKE ? OR author_name LIKE ? OR slug LIKE ?", like, like, like)
	}

	var total int64
	query.Count(&total)

	posts := make([]models.CommunityPost, 0, pageSize)
	query.Order("is_pinned DESC, created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&posts)
	for i := range posts {
		posts[i].HydrateComputed()
	}
	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"data":        posts,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
	})
}

func (ctrl *CommunityController) AdminUpdatePost(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid post id"})
		return
	}
	var post models.CommunityPost
	if err := db.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Post not found"})
		return
	}
	var req AdminUpdateCommunityPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}
	updates := map[string]any{}
	if req.Title != nil && strings.TrimSpace(*req.Title) != "" {
		updates["title"] = strings.TrimSpace(*req.Title)
	}
	if req.Category != nil && models.ValidCommunityCategories[strings.TrimSpace(*req.Category)] {
		updates["category"] = strings.TrimSpace(*req.Category)
	}
	if req.Status != nil {
		s := strings.TrimSpace(*req.Status)
		if s == models.CommunityStatusPublished || s == models.CommunityStatusPending || s == models.CommunityStatusHidden {
			updates["status"] = s
		}
	}
	if req.IsPinned != nil {
		updates["is_pinned"] = *req.IsPinned
	}
	if req.IsFeatured != nil {
		updates["is_featured"] = *req.IsFeatured
	}
	if len(updates) > 0 {
		if err := db.Model(&post).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to update post"})
			return
		}
	}
	db.First(&post, id)
	post.HydrateComputed()
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: post})
}

func (ctrl *CommunityController) AdminListComments(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, models.APIResponse{Success: false, Message: "Community temporarily unavailable"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	status := strings.TrimSpace(c.Query("status"))
	search := strings.TrimSpace(c.Query("search"))

	query := db.Model(&models.CommunityComment{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("body LIKE ? OR author_name LIKE ?", like, like)
	}

	var total int64
	query.Count(&total)

	comments := make([]models.CommunityComment, 0, pageSize)
	query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&comments)
	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"data":        comments,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
	})
}

func (ctrl *CommunityController) AdminUpdateComment(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, models.APIResponse{Success: false, Message: "Community temporarily unavailable"})
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid comment id"})
		return
	}
	var comment models.CommunityComment
	if err := db.First(&comment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Comment not found"})
		return
	}

	var req AdminUpdateCommunityCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request payload"})
		return
	}
	if req.Status == nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Nothing to update"})
		return
	}
	status := strings.TrimSpace(*req.Status)
	if status != models.CommunityStatusPublished && status != models.CommunityStatusPending && status != models.CommunityStatusHidden {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid status"})
		return
	}

	// Hiding a reply also removes it from the public count, otherwise the thread
	// keeps advertising a reply nobody can read.
	wasPublished := comment.Status == models.CommunityStatusPublished
	shouldCount := status == models.CommunityStatusPublished
	if err := db.Model(&comment).Update("status", status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to update comment"})
		return
	}
	if wasPublished != shouldCount {
		delta := "+ 1"
		if !shouldCount {
			delta = "- 1"
		}
		db.Model(&models.CommunityPost{}).
			Where("id = ?", comment.PostID).
			UpdateColumn("comments_count", gorm.Expr("GREATEST(comments_count "+delta+", 0)"))
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: comment})
}

func (ctrl *CommunityController) AdminDeletePost(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid post id"})
		return
	}
	db.Where("post_id = ?", id).Delete(&models.CommunityComment{})
	if err := db.Delete(&models.CommunityPost{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to delete post"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Post deleted"})
}

func (ctrl *CommunityController) AdminDeleteComment(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid comment id"})
		return
	}
	var comment models.CommunityComment
	if err := db.First(&comment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Comment not found"})
		return
	}
	db.Delete(&comment)
	db.Model(&models.CommunityPost{}).
		Where("id = ? AND comments_count > 0", comment.PostID).
		UpdateColumn("comments_count", gorm.Expr("comments_count - 1"))
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Comment deleted"})
}
