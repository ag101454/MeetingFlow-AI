import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  Upload, File, FileText, Image, Video, Music, 
  Archive, Download, Trash2, Folder 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FileManager({ projectId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const organization = useAuthStore(state => state.organization);

  useEffect(() => {
    loadFiles();
  }, [projectId, selectedCategory]);

  const loadFiles = async () => {
    let query = supabase
      .from('files')
      .select('*')
      .eq('organization_id', organization.id);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data } = await query.order('created_at', { ascending: false });
    if (data) setFiles(data);
  };

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    
    for (const file of acceptedFiles) {
      const filePath = `${organization.id}/${projectId || 'general'}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      // Save metadata to database
      await supabase.from('files').insert({
        organization_id: organization.id,
        project_id: projectId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        category: getFileCategory(file.type),
        uploaded_by: useAuthStore.getState().user.id
      });
    }

    setUploading(false);
    loadFiles();
    toast.success('Files uploaded!');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const getFileCategory = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'recording';
    if (mimeType.includes('pdf')) return 'document';
    return 'document';
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image size={20} />;
    if (type?.startsWith('video/')) return <Video size={20} />;
    if (type?.startsWith('audio/')) return <Music size={20} />;
    if (type?.includes('pdf')) return <FileText size={20} />;
    if (type?.includes('zip')) return <Archive size={20} />;
    return <File size={20} />;
  };

  const deleteFile = async (fileId, filePath) => {
    await supabase.storage.from('project-files').remove([filePath]);
    await supabase.from('files').delete().eq('id', fileId);
    toast.success('File deleted');
    loadFiles();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const categories = ['all', 'document', 'image', 'video', 'recording', 'contract', 'deliverable'];

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto text-gray-400 mb-3" size={32} />
        {uploading ? (
          <p className="text-gray-600">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-brand-600">Drop files here</p>
        ) : (
          <>
            <p className="text-gray-600">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Any file type up to 100MB
            </p>
          </>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-sm capitalize ${
              selectedCategory === cat
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map(file => (
          <div
            key={file.id}
            className="flex items-center p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
          >
            <div className="p-2 bg-gray-100 rounded-lg mr-3">
              {getFileIcon(file.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-gray-500">
                {formatSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <Download size={16} />
              </a>
              <button
                onClick={() => deleteFile(file.id, file.url)}
                className="p-1.5 hover:bg-red-50 rounded text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {files.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Folder size={48} className="mx-auto mb-2 opacity-20" />
          <p>No files uploaded yet</p>
        </div>
      )}
    </div>
  );
}