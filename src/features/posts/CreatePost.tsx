import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import usePostStore from '@/store/posts';
import useAuthStore from '@/store/auth';
import { ImageIcon } from 'lucide-react';

const createPostSchema = z.object({
  content: z.string().min(1, 'Post cannot be empty').max(500, 'Post is too long'),
  imageUrl: z.string().url().optional(),
});

type CreatePostData = z.infer<typeof createPostSchema>;

export default function CreatePost() {
  const { user } = useAuthStore();
  const { createPost, isLoading } = usePostStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePostData>({
    resolver: zodResolver(createPostSchema),
  });

  const onSubmit = async (data: CreatePostData) => {
    await createPost(data);
    reset();
    setImagePreview(null);
  };

  if (!user) return null;

  return (
    <div className="card bg-white dark:bg-gray-800 p-4 mb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <textarea
            {...register('content')}
            placeholder="What's on your mind?"
            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 
                     focus:ring-2 focus:ring-primary focus:border-transparent
                     resize-none min-h-[100px]"
          />
          {errors.content && (
            <p className="text-error text-sm mt-1">{errors.content.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                // TODO: Implement image upload
                const url = window.prompt('Enter image URL');
                if (url) {
                  setImagePreview(url);
                  register('imageUrl').onChange({ target: { value: url } });
                }
              }}
              className="p-2 text-gray-500 hover:text-primary rounded-full
                       hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ImageIcon size={20} />
            </button>
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-12 h-12 rounded object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    register('imageUrl').onChange({ target: { value: '' } });
                  }}
                  className="absolute -top-2 -right-2 bg-error text-white rounded-full
                           w-5 h-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}