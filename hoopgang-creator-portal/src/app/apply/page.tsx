// src/app/apply/page.tsx

'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CreatorApplicationInput, Size } from '@/types';
import { SIZES } from '@/lib/constants';
import { createCreator, updateCreator, getCreatorByUserId } from '@/lib/firestore';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui';

export default function ApplyPage() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if user has an active collaboration
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (user) {
        try {
          const existingCreator = await getCreatorByUserId(user.uid);
          if (existingCreator && !['completed', 'denied', 'ghosted'].includes(existingCreator.status)) {
            router.push('/creator/dashboard');
          }
        } catch (err) {
          console.log('No existing application found, allowing new application');
        }
      }
    };
    checkExistingApplication();
  }, [user, router]);

  const [formData, setFormData] = useState<CreatorApplicationInput>({
    fullName: '',
    email: '',
    instagramHandle: '',
    instagramFollowers: 0,
    tiktokHandle: '',
    tiktokFollowers: 0,
    bestContentUrl: '',
    product: '',
    size: 'M' as Size,
    height: '',
    weight: '',
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
    if (!formData.product.trim()) {
      setError('Please enter the product you want');
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
      const creatorDocId = await createCreator(formData);
      const userId = await signUp(formData.email, password, 'creator', creatorDocId);
      await updateCreator(creatorDocId, { userId });

      setSuccess(true);
      setLoading(false);
      showToast('Application submitted! Welcome to HoopGang!', 'success');

      setTimeout(() => {
        router.push('/creator/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Application error:', err);
      let errorMessage = 'Failed to submit application. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          errorMessage = 'An account with this email already exists. Please log in instead.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all';
  const labelClasses = 'block text-white/50 text-xs uppercase tracking-wider mb-2';
  const selectClasses =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-white/[0.08] transition-all appearance-none cursor-pointer';

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4 relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-full h-full bg-zinc-800/50 rounded-2xl border border-white/10 flex items-center justify-center p-4">
              <Image
                src="/images/THG_logo_orange.png"
                alt="HoopGang"
                width={56}
                height={56}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">
            Join the HoopGang Creator Squad
          </h1>
          <p className="text-white/60 text-lg">
            Get free gear. Create fire content. Get paid to hoop.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-300">
          {success ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 mb-6">
                <span className="text-5xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
              <p className="text-white/60">Redirecting you to your dashboard...</p>
              <div className="mt-6">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Section 1: Account Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold">
                    1
                  </div>
                  <h2 className="text-lg font-semibold text-white">Account Info</h2>
                </div>

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
                      placeholder="Min 6 characters"
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
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Section 2: Social Media */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold">
                    2
                  </div>
                  <h2 className="text-lg font-semibold text-white">Social Media</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="instagramHandle" className={labelClasses}>
                      Instagram Handle <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">@</span>
                      <input
                        type="text"
                        id="instagramHandle"
                        name="instagramHandle"
                        value={formData.instagramHandle}
                        onChange={handleInputChange}
                        placeholder="jordanhoops"
                        required
                        className={`${inputClasses} pl-8`}
                      />
                    </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tiktokHandle" className={labelClasses}>
                      TikTok Handle <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">@</span>
                      <input
                        type="text"
                        id="tiktokHandle"
                        name="tiktokHandle"
                        value={formData.tiktokHandle}
                        onChange={handleInputChange}
                        placeholder="jordanhoops"
                        required
                        className={`${inputClasses} pl-8`}
                      />
                    </div>
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

                <div>
                  <label htmlFor="bestContentUrl" className={labelClasses}>
                    Link to Your Best Content <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </span>
                    <input
                      type="url"
                      id="bestContentUrl"
                      name="bestContentUrl"
                      value={formData.bestContentUrl}
                      onChange={handleInputChange}
                      placeholder="https://tiktok.com/@you/video/123456"
                      required
                      className={`${inputClasses} pl-10`}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Section 3: Product Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold">
                    3
                  </div>
                  <h2 className="text-lg font-semibold text-white">Product Selection</h2>
                </div>

                {/* Store Link */}
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-4">
                  <p className="text-white/70 text-sm mb-2">
                    Browse our store to find the product you want:
                  </p>
                  <a
                    href="https://thehoopgang.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors font-medium"
                  >
                    <span>Visit TheHoopGang Store</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="product" className={labelClasses}>
                      Product Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="product"
                      name="product"
                      value={formData.product}
                      onChange={handleInputChange}
                      placeholder="e.g. Reversible Mesh Shorts"
                      required
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="size" className={labelClasses}>
                      Size <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="size"
                        name="size"
                        value={formData.size}
                        onChange={handleInputChange}
                        required
                        className={selectClasses}
                      >
                        <option value="" className="bg-zinc-900">
                          Choose size
                        </option>
                        {SIZES.map((size) => (
                          <option key={size.value} value={size.value} className="bg-zinc-900">
                            {size.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Height & Weight (Optional) */}
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mt-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-white/50">📏</span>
                    <p className="text-white/50 text-sm">
                      Optional: Providing your height and weight helps us recommend the best fit for you.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="height" className={labelClasses}>
                        Height <span className="text-white/30">(optional)</span>
                      </label>
                      <input
                        type="text"
                        id="height"
                        name="height"
                        value={formData.height || ''}
                        onChange={handleInputChange}
                        placeholder={`e.g. 5'10" or 178 cm`}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label htmlFor="weight" className={labelClasses}>
                        Weight <span className="text-white/30">(optional)</span>
                      </label>
                      <input
                        type="text"
                        id="weight"
                        name="weight"
                        onChange={handleInputChange}
                        value={formData.weight || ''}
                        placeholder="e.g. 165 lbs or 75 kg"
                        className={inputClasses}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Section 4: Shipping Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold">
                    4
                  </div>
                  <h2 className="text-lg font-semibold text-white">Shipping Address</h2>
                </div>

                <div>
                  <label htmlFor="shippingAddress.street" className={labelClasses}>
                    Street Address <span className="text-orange-500">*</span>
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

                <div>
                  <label htmlFor="shippingAddress.unit" className={labelClasses}>
                    Apt/Unit <span className="text-white/30">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="shippingAddress.unit"
                    name="shippingAddress.unit"
                    value={formData.shippingAddress.unit}
                    onChange={handleInputChange}
                    placeholder="Apt 4B"
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
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
                  <div>
                    <label htmlFor="shippingAddress.zipCode" className={labelClasses}>
                      ZIP <span className="text-orange-500">*</span>
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
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Section 5: About You */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold">
                    5
                  </div>
                  <h2 className="text-lg font-semibold text-white">About You</h2>
                </div>

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

                <div>
                  <label className={labelClasses}>Have you worked with other brands before?</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="radio"
                          name="previousBrands"
                          value="true"
                          checked={formData.previousBrands === true}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-5 h-5 rounded-full border-2 border-white/20 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-all flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <span className="text-white/80 group-hover:text-white transition-colors">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="radio"
                          name="previousBrands"
                          value="false"
                          checked={formData.previousBrands === false}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-5 h-5 rounded-full border-2 border-white/20 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-all flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <span className="text-white/80 group-hover:text-white transition-colors">No</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Agreement Card */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-5 hover:border-orange-500/30 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      name="agreedToTerms"
                      checked={formData.agreedToTerms}
                      onChange={handleInputChange}
                      required
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded border-2 border-white/20 peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-all flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white group-hover:text-orange-100 transition-colors">
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
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <span>🔥</span>
                  </>
                )}
              </button>

              {/* Already have an account */}
              <p className="text-center text-white/50 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
                  Sign in here
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}