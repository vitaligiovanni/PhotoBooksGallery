import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ImageEditor from './ImageEditor';

const TestImageEditor = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [editedImage, setEditedImage] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const handleImageSelect = (event) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedImage(event.target.files[0]);
            setIsEditorOpen(true);
        }
    };

    const handleSave = (editedBlob) => {
        setEditedImage(URL.createObjectURL(editedBlob));
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
                Image Editor Test
            </Typography>

            <Box sx={{ mb: 4 }}>
                <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="image-input"
                    type="file"
                    onChange={handleImageSelect}
                />
                <label htmlFor="image-input">
                    <Button variant="contained" component="span">
                        Select Image
                    </Button>
                </label>
            </Box>

            {selectedImage && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Original Image:
                    </Typography>
                    <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="Original"
                        style={{ maxWidth: '100%', maxHeight: '400px' }}
                    />
                </Box>
            )}

            {editedImage && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Edited Image:
                    </Typography>
                    <img
                        src={editedImage}
                        alt="Edited"
                        style={{ maxWidth: '100%', maxHeight: '400px' }}
                    />
                </Box>
            )}

            {selectedImage && (
                <ImageEditor
                    open={isEditorOpen}
                    onClose={() => setIsEditorOpen(false)}
                    image={selectedImage}
                    onSave={handleSave}
                />
            )}
        </Box>
    );
};

export default TestImageEditor;
