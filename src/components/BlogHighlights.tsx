import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { blogPosts } from "@/data/blogPosts";
import { CalendarDays, ArrowRight } from "lucide-react";

export const BlogHighlights = () => {
  return (
    <section id="blog" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">Blog ve Duyurular</h2>
          <p className="text-lg text-muted-foreground">
            Araç kiralama, filo yönetimi ve sürüş ipuçları hakkında güncel içeriklere göz atın.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Card key={post.slug} className="flex flex-col overflow-hidden border-border bg-card group">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-primary hover:bg-primary/90 text-white shadow-md">
                    {post.tag}
                  </Badge>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <Link to={`/blog/${post.slug}`} className="group/title">
                  <h3 className="text-xl font-semibold text-foreground mb-3 leading-snug transition-colors group-hover/title:text-primary">
                    {post.title}
                  </h3>
                </Link>
                <p className="text-muted-foreground mb-6 flex-1">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    {post.date}
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary/90 hover:bg-primary/10 -mr-3">
                    <Link to={`/blog/${post.slug}`}>
                      Devamını Oku
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline">
            <Link to="/blog">Tüm Blog Yazıları</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
