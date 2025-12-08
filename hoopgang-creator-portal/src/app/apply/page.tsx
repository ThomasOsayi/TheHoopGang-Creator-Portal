// src/app/apply/page.tsx

'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreatorApplicationInput, ProductType, Size } from '@/types';
import { PRODUCTS, SIZES } from '@/lib/constants';
import { createCreator, updateCreator } from '@/lib/firestore';
import { useAuth } from '@/lib/auth-context';

export default function ApplyPage() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/creator/dashboard');
    }
  }, [user, router]);

  const [formData, setFormData] = useState<CreatorApplicationInput>({
    fullName: '',
    email: '',
    phone: '',
    instagramHandle: '',
    instagramFollowers: 0,
    tiktokHandle: '',
    tiktokFollowers: 0,
    bestContentUrl: '',
    product: 'Reversible Shorts' as ProductType,
    size: 'M' as Size,
    shippingAddress: {
      street: '',
      unit: '',
      city: '',
      state: '',
      zipCode: '',
    },
    whyCollab: '',
    previousBrands: false,
    agreedToTerms: false,
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('shippingAddress.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [field]: value,
        },
      }));
    } else if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else if (type === 'radio') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === 'true',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.instagramHandle.trim()) {
      setError('Instagram handle is required');
      return false;
    }
    if (formData.instagramFollowers <= 0) {
      setError('Instagram followers must be greater than 0');
      return false;
    }
    if (!formData.tiktokHandle.trim()) {
      setError('TikTok handle is required');
      return false;
    }
    if (formData.tiktokFollowers <= 0) {
      setError('TikTok followers must be greater than 0');
      return false;
    }
    if (!formData.bestContentUrl.trim()) {
      setError('Best content URL is required');
      return false;
    }
    if (!formData.shippingAddress.street.trim()) {
      setError('Street address is required');
      return false;
    }
    if (!formData.shippingAddress.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.shippingAddress.state.trim()) {
      setError('State is required');
      return false;
    }
    if (!formData.shippingAddress.zipCode.trim()) {
      setError('ZIP code is required');
      return false;
    }
    if (!formData.whyCollab.trim()) {
      setError('Please tell us why you want to collaborate');
      return false;
    }
    if (!formData.agreedToTerms) {
      setError('You must agree to the terms to submit your application');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 1. Create the creator document first
      const creatorDocId = await createCreator(formData);

      // 2. Create auth account and link to creator
      const userId = await signUp(formData.email, password, 'creator', creatorDocId);

      // 3. Update creator document with userId
      await updateCreator(creatorDocId, { userId });

      // 4. Redirect to dashboard (user is now logged in)
      router.push('/creator/dashboard');
      
    } catch (err) {
      console.error('Application error:', err);
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('An account with this email already exists. Please log in instead.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to submit application. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-colors";
  const labelClasses = "block text-white/60 text-sm mb-2";
  const selectClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🏀</div>
          <h1 className="text-4xl font-black text-white mb-3">
            Join the HoopGang Creator Squad
          </h1>
          <p className="text-white/60 text-lg">
            Get free gear. Create fire content. Get paid to hoop.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
          {success ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
              <p className="text-white/60">Redirecting you to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Row 1: Full Name | Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className={labelClasses}>
                    Full Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Jordan Smith"
                    required
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    Email <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="jordan@email.com"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className={labelClasses}>
                    Password <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputClasses}
                    placeholder="Create a password (min 6 characters)"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className={labelClasses}>
                    Confirm Password <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={inputClasses}
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              {/* Row 2: Phone Number */}
              <div>
                <label htmlFor="phone" className={labelClasses}>
                  Phone Number <span className="text-orange-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  required
                  className={inputClasses}
                />
              </div>

              {/* Row 3: Instagram Handle | Instagram Followers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="instagramHandle" className={labelClasses}>
                    Instagram Handle <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="instagramHandle"
                    name="instagramHandle"
                    value={formData.instagramHandle}
                    onChange={handleInputChange}
                    placeholder="@jordanhoops"
                    required
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="instagramFollowers" className={labelClasses}>
                    Instagram Followers <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="instagramFollowers"
                    name="instagramFollowers"
                    value={formData.instagramFollowers || ''}
                    onChange={handleInputChange}
                    placeholder="12500"
                    required
                    min="1"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Row 4: TikTok Handle | TikTok Followers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tiktokHandle" className={labelClasses}>
                    TikTok Handle <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="tiktokHandle"
                    name="tiktokHandle"
                    value={formData.tiktokHandle}
                    onChange={handleInputChange}
                    placeholder="@jordanhoops"
                    required
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="tiktokFollowers" className={labelClasses}>
                    TikTok Followers <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="tiktokFollowers"
                    name="tiktokFollowers"
                    value={formData.tiktokFollowers || ''}
                    onChange={handleInputChange}
                    placeholder="8300"
                    required
                    min="1"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Row 5: Best Content URL */}
              <div>
                <label htmlFor="bestContentUrl" className={labelClasses}>
                  Link to Your Best Content <span className="text-orange-500">*</span>
                </label>
                <input
                  type="url"
                  id="bestContentUrl"
                  name="bestContentUrl"
                  value={formData.bestContentUrl}
                  onChange={handleInputChange}
                  placeholder="https://tiktok.com/@jordanhoops/video/123456"
                  required
                  className={inputClasses}
                />
              </div>

              {/* Row 6: Product Selection | Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product" className={labelClasses}>
                    Product Selection <span className="text-orange-500">*</span>
                  </label>
                  <select
                    id="product"
                    name="product"
                    value={formData.product}
                    onChange={handleInputChange}
                    required
                    className={selectClasses}
                  >
                    <option value="" className="bg-zinc-900">Choose a product</option>
                    {PRODUCTS.map((product) => (
                      <option key={product.value} value={product.value} className="bg-zinc-900">
                        {product.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="size" className={labelClasses}>
                    Size <span className="text-orange-500">*</span>
                  </label>
                  <select
                    id="size"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    required
                    className={selectClasses}
                  >
                    <option value="" className="bg-zinc-900">Choose size</option>
                    {SIZES.map((size) => (
                      <option key={size.value} value={size.value} className="bg-zinc-900">
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 7: Shipping Address - Street */}
              <div>
                <label htmlFor="shippingAddress.street" className={labelClasses}>
                  Shipping Address <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  id="shippingAddress.street"
                  name="shippingAddress.street"
                  value={formData.shippingAddress.street}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                  required
                  className={inputClasses}
                />
              </div>

              {/* Row 8: Apt/Unit (optional) */}
              <div>
                <label htmlFor="shippingAddress.unit" className={labelClasses}>
                  Apt/Unit
                </label>
                <input
                  type="text"
                  id="shippingAddress.unit"
                  name="shippingAddress.unit"
                  value={formData.shippingAddress.unit}
                  onChange={handleInputChange}
                  placeholder="Apt 4B (optional)"
                  className={inputClasses}
                />
              </div>

              {/* Row 9: City | State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="shippingAddress.city" className={labelClasses}>
                    City <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="shippingAddress.city"
                    name="shippingAddress.city"
                    value={formData.shippingAddress.city}
                    onChange={handleInputChange}
                    placeholder="Los Angeles"
                    required
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="shippingAddress.state" className={labelClasses}>
                    State <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="shippingAddress.state"
                    name="shippingAddress.state"
                    value={formData.shippingAddress.state}
                    onChange={handleInputChange}
                    placeholder="CA"
                    required
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Row 10: ZIP Code */}
              <div>
                <label htmlFor="shippingAddress.zipCode" className={labelClasses}>
                  ZIP Code <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  id="shippingAddress.zipCode"
                  name="shippingAddress.zipCode"
                  value={formData.shippingAddress.zipCode}
                  onChange={handleInputChange}
                  placeholder="90012"
                  required
                  className={inputClasses}
                />
              </div>

              {/* Row 11: Why Collab */}
              <div>
                <label htmlFor="whyCollab" className={labelClasses}>
                  Why do you want to collab with HoopGang? <span className="text-orange-500">*</span>
                </label>
                <textarea
                  id="whyCollab"
                  name="whyCollab"
                  value={formData.whyCollab}
                  onChange={handleInputChange}
                  placeholder="Tell us why you're excited to work with us..."
                  required
                  rows={4}
                  className={`${inputClasses} resize-none`}
                />
              </div>

              {/* Row 12: Previous Brands */}
              <div>
                <label className={labelClasses}>
                  Have you worked with other brands before?
                </label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="previousBrands"
                      value="true"
                      checked={formData.previousBrands === true}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-orange-500 bg-white/5 border-white/10 focus:ring-orange-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-white/80">Yes</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="previousBrands"
                      value="false"
                      checked={formData.previousBrands === false}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-orange-500 bg-white/5 border-white/10 focus:ring-orange-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-white/80">No</span>
                  </label>
                </div>
              </div>

              {/* Row 13: Agreement Checkbox */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-4 h-4 text-orange-500 bg-white/5 border-white/20 rounded focus:ring-orange-500 focus:ring-offset-0"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-semibold text-white">
                      I agree to post 3 TikToks within 14 days of receiving my product
                    </span>
                    <p className="text-xs text-white/50 mt-1">
                      I understand that failure to post may disqualify me from future collaborations.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Submitting...' : 'Submit Application 🔥'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}