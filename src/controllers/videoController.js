const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

// Helper: parse comma-separated tags
function parseTags(tagsString) {
  return tagsString
    ? tagsString.split(',').map(t => t.trim()).filter(Boolean)
    : [];
}

exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, category, allow_comments, allow_download, scheduled_at, tags } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const videoUrl = `/uploads/${req.file.filename}`;

    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized: user id missing' });
    const status = req.body.visibility || 'public';
    // Create video record
    const video = await prisma.videos.create({
      data: {
        title,
        description,
        category,
        allow_comments: allow_comments !== undefined ? allow_comments === 'true' : true,
        allow_download: allow_download !== undefined ? allow_download === 'true' : false,
        video_url: videoUrl,
        user_id: userId,
        status,
      },
    });

    // Handle tags (free-form, create if not exist)
    const tagNames = parseTags(tags);
    for (const tagName of tagNames) {
      let tag = await prisma.tags.findUnique({ where: { name: tagName } });
      if (!tag) {
        tag = await prisma.tags.create({ data: { name: tagName } });
      }
      await prisma.video_tags.create({ data: { video_id: video.id, tag_id: tag.id } });
    }

    res.status(201).json({ message: 'Upload Video Successful!!' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload video', reason: err.message });
  }
}; 