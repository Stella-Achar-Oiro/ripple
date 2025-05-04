'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image, X, Loader } from 'lucide-react';
import usePostsStore from '@/store/posts';
import Button from './Button';

const createPostSchema = z.object({
  content: z.string().min(1, 'Post cannot be empty').max(500, 'Post is too long (max 500 characters)'),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

export default function CreatePostForm() {
  const { createPost, isLoading } = usePostsStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
  });
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }
    
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  
  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };
  
  const onSubmit = async (data: CreatePostFormData) => {
    try {
      await createPost({
        content: data.content,
        image: imageFile || undefined,
      });
      
      // Reset form after successful post
      reset();
      setImagePreview(null);
      setImageFile(null);
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <textarea
        {...register('content')}
        placeholder="What's on your mind?"
        className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none dark:bg-gray-800"
        rows={3}
        disabled={isLoading}
      />
      
      {errors.content && (
        <p className="mt-1 text-error text-sm">{errors.content.message}</p>
      )}
      
      {imagePreview && (
        <div className="relative mt-3">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-h-60 rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <label className="cursor-pointer text-gray-500 hover:text-primary">
          <Image size={20} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
            disabled={isLoading}
          />
        </label>
        
        <Button type="submit" isLoading={isLoading}>
          Post
        </Button>
      </div>
    </form>
  );
}