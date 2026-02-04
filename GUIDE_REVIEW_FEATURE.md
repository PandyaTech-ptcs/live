# Guide Rating and Review Feature

## Overview
આ feature યુઝર્સને guide booking પછી guide માટે rating અને comment add કરવાની સુવિધા આપે છે.

## Backend Changes (server/index.js)

### 1. New Model: GuideReview
```javascript
const GuideReview = sequelize.define('GuideReview', {
    guideContact: { type: DataTypes.STRING, allowNull: false },
    guideName: { type: DataTypes.STRING },
    userContact: { type: DataTypes.STRING, allowNull: false },
    userName: { type: DataTypes.STRING },
    appointmentId: { type: DataTypes.INTEGER },
    rating: { type: DataTypes.INTEGER, allowNull: false }, // 1-5 stars
    comment: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});
```

### 2. New API Endpoints

#### Submit Review
- **Endpoint**: `POST /api/reviews/submit`
- **Body**:
  ```json
  {
    "guideContact": "string",
    "guideName": "string",
    "userContact": "string",
    "userName": "string",
    "appointmentId": number,
    "rating": number (1-5),
    "comment": "string (optional)"
  }
  ```
- **Features**:
  - Validates rating (1-5)
  - Prevents duplicate reviews for same appointment
  - Automatically updates guide's average rating

#### Get Reviews for Guide
- **Endpoint**: `GET /api/reviews/guide/:contact`
- **Returns**: Array of all reviews for a specific guide

#### Check Review Status
- **Endpoint**: `GET /api/reviews/can-review/:appointmentId`
- **Returns**: `{ canReview: boolean }`

## Frontend Changes (client/App.js)

### 1. New States
```javascript
const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
const [selectedAppointmentForReview, setSelectedAppointmentForReview] = useState(null);
const [reviewRating, setReviewRating] = useState(0);
const [reviewComment, setReviewComment] = useState('');
const [isSubmittingReview, setIsSubmittingReview] = useState(false);
const [reviewedAppointments, setReviewedAppointments] = useState(new Set());
```

### 2. New Function: handleSubmitReview
- Validates rating selection
- Submits review to backend
- Updates UI to show "Reviewed" status
- Shows success message in Gujarati

### 3. Updated UserBookingsView Component
- Shows "Rate Guide" button for accepted bookings
- Shows "Reviewed" badge for already reviewed bookings
- Opens review modal when clicked

### 4. New Review Modal
- Beautiful gradient design matching app theme
- Interactive star rating (1-5 stars)
- Optional comment text area
- Gujarati labels and messages
- Submit button with loading state

### 5. Updated fetchUserBookings
- Automatically checks which appointments have been reviewed
- Updates reviewedAppointments state
- Prevents duplicate review submissions

## Features

### For Users:
1. **Rate Guide**: After booking is accepted, users can rate the guide
2. **Star Rating**: Select 1-5 stars
3. **Comment**: Optional text feedback about the guide
4. **One Review Per Booking**: Can't submit multiple reviews for same booking
5. **Visual Feedback**: Shows "Reviewed" badge after submission

### For Guides:
- Average rating automatically calculated
- Rating displayed in guide list
- Reviews stored with user details

## How to Use

1. **User books a guide** through the app
2. **Guide accepts** the booking
3. **User sees "Rate Guide" button** in "My Guide Bookings"
4. **User clicks button** → Review modal opens
5. **User selects stars** (1-5) and optionally adds comment
6. **User submits** → Success message shown
7. **Button changes to "Reviewed"** badge

## Database Migration

The server will automatically create the `GuideReviews` table when restarted (using Sequelize `sync({ alter: true })`).

## Testing Steps

1. Restart the server: `node index.js`
2. Login as a user
3. Book a guide
4. Have guide accept the booking (from guide dashboard)
5. Go to "My Guide Bookings" in user profile
6. Click "⭐ Rate Guide" button
7. Select rating and add comment
8. Submit review
9. Verify "Reviewed" badge appears

## UI/UX Highlights

- **Gujarati Interface**: All labels in Gujarati for local users
- **Premium Design**: Gradient backgrounds, smooth animations
- **Intuitive**: Large star buttons, clear visual feedback
- **Mobile-Friendly**: Touch-optimized for mobile devices
- **Error Handling**: Validates input before submission

## Future Enhancements (Optional)

1. Display reviews in guide details modal
2. Add review statistics (average rating, total reviews)
3. Allow users to edit their reviews
4. Add photo upload to reviews
5. Filter guides by rating
6. Show recent reviews on guide profile

---

**Status**: ✅ Implementation Complete
**Language**: Gujarati (ગુજરાતી)
**Tested**: Ready for testing after server restart
