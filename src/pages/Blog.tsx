import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingContactButtons } from "@/components/FloatingContactButtons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/data/blogPosts";
import { CalendarDays, ArrowRight } from "lucide-react";

const BlogPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Blog Yazilari</h1>
            <p className="mt-3 text-muted-foreground text-lg">
              Arac kiralama ve filo yonetimi hakkinda detayli icerikleri buradan takip edebilirsiniz.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Card key={post.slug} className="overflow-hidden flex flex-col">
                <img src={post.image} alt={post.title} className="w-full h-52 object-cover" />
                <div className="p-5 flex flex-col flex-1">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Badge>{post.tag}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {post.date}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">{post.title}</h2>
                  <p className="text-muted-foreground flex-1">{post.excerpt}</p>
                  <Button asChild variant="ghost" className="mt-4 w-fit text-primary">
                    <Link to={`/blog/${post.slug}`}>
                      Devamini Oku
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <FloatingContactButtons />
    </div>
  );
};

export default BlogPage;
