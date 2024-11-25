import { Box, IconButton } from '@mui/material';
import { Delete as DeleteIcon, AddPhotoAlternate as AddPhotoIcon } from '@mui/icons-material';

const PhotoBookPage = ({ 
    pageWidth,
    pageHeight,
    photos = [],
    onPhotoAdd,
    onPhotoRemove
}) => {
    const handleDrop = (e, position) => {
        e.preventDefault();
        const photoData = e.dataTransfer.getData('photo');
        if (photoData) {
            const photo = JSON.parse(photoData);
            onPhotoAdd(position, photo);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.currentTarget.style.backgroundColor = '';
    };

    return (
        <Box
            sx={{
                width: pageWidth,
                height: pageHeight,
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 0,
                overflow: 'hidden',
                bgcolor: 'common.white',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gridTemplateRows: 'repeat(2, 1fr)',
                gap: 1,
                p: 0.5
            }}
        >
            {[0, 1, 2, 3].map((position) => {
                const photo = photos.find(p => p.position === position);
                
                return (
                    <Box
                        key={position}
                        sx={{
                            position: 'relative',
                            border: '2px dashed',
                            borderColor: photo ? 'transparent' : 'grey.300',
                            borderRadius: 1,
                            overflow: 'hidden'
                        }}
                        onDrop={(e) => handleDrop(e, position)}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {photo ? (
                            <>
                                <img
                                    src={photo.preview || photo.url}
                                    alt={`Photo ${photo.id}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                <Box
                                    className="photo-controls"
                                    sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        opacity: 0,
                                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                                        borderRadius: 1
                                    }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() => onPhotoRemove(position)}
                                        sx={{ 
                                            color: 'common.white',
                                            '&:hover': {
                                                bgcolor: 'error.main'
                                            }
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </>
                        ) : (
                            <Box
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'text.secondary'
                                }}
                            >
                                <AddPhotoIcon sx={{ fontSize: 24 }} />
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
};

export default PhotoBookPage;
