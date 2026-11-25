package services

import (
	"slices"
	"testing"

	"kavten-backend/models"
)

func TestBuildProductIndexNowURLsUsesOnlyCompleteTranslations(t *testing.T) {
	product := models.Product{
		SKU: "A06B-6092-H275#H508",
		Translations: []models.ProductTranslation{
			{LanguageCode: "es", Name: "Amplificador de husillo FANUC", Description: "Módulo para reparación CNC."},
			{LanguageCode: "de", Name: "FANUC Verstärker"},
		},
	}
	urls := BuildProductIndexNowURLs("https://www.kavten.com", product)
	if !slices.Contains(urls, "https://www.kavten.com/es/products/A06B-6092-H275%23H508") {
		t.Fatalf("expected complete Spanish translation URL, got %v", urls)
	}
	if slices.Contains(urls, "https://www.kavten.com/de/products/A06B-6092-H275%23H508") {
		t.Fatalf("incomplete German translation must not be submitted: %v", urls)
	}
	if !slices.Contains(urls, "https://www.kavten.com/sitemap.xml") {
		t.Fatalf("primary sitemap must be submitted after a product update: %v", urls)
	}
	if slices.Contains(urls, "https://www.kavten.com/sitemap-products-index.xml") {
		t.Fatalf("deprecated nested product sitemap index must not be submitted: %v", urls)
	}
}

func TestBuildDefaultIndexNowURLsIncludesBlogSitemap(t *testing.T) {
	urls := BuildDefaultIndexNowURLs("https://www.kavten.com")
	for _, expected := range []string{"https://www.kavten.com/blog", "https://www.kavten.com/sitemap.xml", "https://www.kavten.com/sitemap-blog.xml"} {
		if !slices.Contains(urls, expected) {
			t.Fatalf("expected %q in %v", expected, urls)
		}
	}
	if slices.Contains(urls, "https://www.kavten.com/sitemap-products-index.xml") {
		t.Fatalf("deprecated nested product sitemap index must not be in defaults: %v", urls)
	}
}

func TestBuildArticleIndexNowURLsUsesOnlyCompleteTranslations(t *testing.T) {
	article := models.Article{
		Slug:        "fanuc-spindle-amplifier-alarm-codes",
		ContentType: "blog",
		Translations: []models.ArticleTranslation{
			{LanguageCode: "es", Title: "Códigos de alarma", Content: "Contenido técnico completo."},
			{LanguageCode: "de", Title: "Alarmcodes", Content: ""},
		},
	}
	urls := BuildArticleIndexNowURLs("https://www.kavten.com", article, "/blog/fanuc-spindle-amplifier-alarm-codes")
	if !slices.Contains(urls, "https://www.kavten.com/es/blog/fanuc-spindle-amplifier-alarm-codes") {
		t.Fatalf("expected complete Spanish article translation URL, got %v", urls)
	}
	if slices.Contains(urls, "https://www.kavten.com/de/blog/fanuc-spindle-amplifier-alarm-codes") {
		t.Fatalf("did not expect incomplete German article translation URL, got %v", urls)
	}
	if !slices.Contains(urls, "https://www.kavten.com/sitemap-blog.xml") {
		t.Fatalf("expected blog sitemap URL, got %v", urls)
	}
}
