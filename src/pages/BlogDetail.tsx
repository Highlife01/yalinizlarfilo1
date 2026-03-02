import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingContactButtons } from "@/components/FloatingContactButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { blogPosts } from "@/data/blogPosts";
import { ArrowLeft, CalendarDays, Share2, Facebook, Twitter, MessageCircle } from "lucide-react";

const BlogDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((item) => item.slug === slug);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <Card className="p-8 text-center">
              <h1 className="text-2xl font-bold mb-3">Yazi bulunamadi</h1>
              <p className="text-muted-foreground mb-6">Aradiginiz blog yazisi kaldirilmis veya link degismis olabilir.</p>
              <Button asChild>
                <Link to="/blog">Blog listesine don</Link>
              </Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <article className="container mx-auto px-4 max-w-4xl">
          <Button asChild variant="ghost" className="mb-4 -ml-3">
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tum yazilar
            </Link>
          </Button>

          <img src={post.image} alt={post.title} className="w-full h-[320px] md:h-[420px] object-cover rounded-xl mb-6" />

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge>{post.tag}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              {post.date}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{post.title}</h1>

          <div className="space-y-5 text-base md:text-lg leading-8 text-foreground/90 pb-8 border-b">
            {post.content.map((paragraph, index) => (
              <p key={`${post.slug}-paragraph-${index}`}>{paragraph}</p>
            ))}
          </div>

          <div className="py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5" /> Bu Yazıyı Paylaş
            </h3>
            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(post.title + " " + currentUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                aria-label="WhatsApp'ta Paylaş"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                aria-label="Facebook'ta Paylaş"
              >
                <Facebook className="w-5 h-5 fill-current" />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                aria-label="Twitter'da Paylaş"
              >
                <Twitter className="w-5 h-5 fill-current" />
              </a>
            </div>
          </div>

          <div className="pt-8">
            <h2 className="text-2xl font-bold mb-6">İlginizi Çekebilecek Diğer Yazılar</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {blogPosts
                .filter((p) => p.slug !== post.slug)
                .slice(0, 3)
                .map((relatedPost) => (
                  <Card key={relatedPost.slug} className="overflow-hidden flex flex-col">
                    <img src={relatedPost.image} alt={relatedPost.title} className="w-full h-40 object-cover" />
                    <div className="p-4 flex flex-col flex-1">
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs">{relatedPost.tag}</Badge>
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <Button asChild variant="link" className="p-0 h-auto w-fit text-primary mt-auto">
                        <Link to={`/blog/${relatedPost.slug}`}>Devamını Oku</Link>
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        </article>
      </main>
      <Footer />
      <FloatingContactButtons />
    </div>
  );
};

export default BlogDetailPage;
