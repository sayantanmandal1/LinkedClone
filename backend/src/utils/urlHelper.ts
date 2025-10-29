/**
 * Utility function to ensure all image URLs use HTTPS
 * This fixes existing images that might have HTTP URLs in the database
 */
export const ensureHttpsUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;
  
  // Convert any HTTP localhost or render URLs to HTTPS
  return url
    .replace('http://localhost:5000', 'https://linkedclone.onrender.com')
    .replace('http://linkedclone.onrender.com', 'https://linkedclone.onrender.com');
};

/**
 * Transform user object to ensure HTTPS URLs
 */
export const transformUserUrls = (user: any) => {
  if (!user) return user;
  
  return {
    ...user,
    profilePicture: ensureHttpsUrl(user.profilePicture)
  };
};

/**
 * Transform post object to ensure HTTPS URLs
 */
export const transformPostUrls = (post: any) => {
  if (!post) return post;
  
  return {
    ...post,
    imageUrl: ensureHttpsUrl(post.imageUrl),
    author: post.author ? transformUserUrls(post.author) : post.author
  };
};