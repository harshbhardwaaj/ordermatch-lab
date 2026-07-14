"""
Django settings for ordermatch project.

See docs/spec-kit/plan.md's Backend Architecture section and
docs/spec-kit/clarifications.md §7-8 for why this backend exists and how
it's shaped: Django + DRF + Postgres, hosted on Render, OpenAI API called
server-side only.
"""

import os
from pathlib import Path

import dj_database_url
from corsheaders.defaults import default_headers
from dotenv import load_dotenv

from common.middleware import DEMO_SESSION_RESPONSE_HEADER

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-1egt6r(@_d3@kh759c++$3oa9g_n^c#b#=$3r4v5@yh594$u!u",
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "catalogs",
    "orders",
    "matching",
    "onboarding",
    "evals",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "common.middleware.DemoSessionMiddleware",
]

ROOT_URLCONF = "ordermatch.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "ordermatch.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
#
# Local dev and Render both connect via DATABASE_URL so the same config
# works in both places. Falls back to the local `ordermatch_dev` Postgres
# database (see README) if DATABASE_URL isn't set.

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get(
            "DATABASE_URL",
            "postgres://ordermatch:ordermatch_dev_pw@localhost:5432/ordermatch_dev",
        ),
        conn_max_age=600,
    )
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Frontend origins allowed to call this API (Next.js dev server, and the
# deployed Vercel URL once known).
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000"
    ).split(",")
    if origin.strip()
]

# Lets the frontend send/read the per-visitor demo-session id (common.
# middleware.DemoSessionMiddleware) as a plain header rather than a
# cookie — a cookie was tried first but WebKit (Safari, and every
# browser on iOS, which all use WebKit under the hood) unreliably
# dropped a cross-site SameSite=None cookie between requests. A header
# stored in the frontend's localStorage isn't subject to any browser's
# cookie policy at all.
CORS_ALLOW_HEADERS = list(default_headers) + [DEMO_SESSION_RESPONSE_HEADER.lower()]
CORS_EXPOSE_HEADERS = [DEMO_SESSION_RESPONSE_HEADER]

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# Called only from backend code (OpenAI API for extraction/matching-assist,
# Phase 13). Never read this from frontend code or send it to the browser.
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# One shared workspace instead of a private copy per browser (see
# common.middleware.DemoSessionMiddleware).
#
# Empty by default, and that direction is the whole point.
#
# Set to a string, every visitor shares one workspace. That is right for a link
# addressed to one company: the learning loop is the point of this build, and a
# memory that evaporates when you close the tab is not a memory. Corrections have
# to still be there tomorrow, and be there for the colleague they forwarded it to.
#
# Empty, every visitor gets their own isolated copy. That is right for a public
# link, and it must be what happens when nobody configured anything, because the
# other failure is unacceptable: a shared workspace on a public URL lets strangers
# read and reset each other's work, and if it is the same workspace an invited
# company is reading, someone can wipe your deliverable while they have it open.
#
# So the deployment that wants the risky mode has to ask for it by name
# (SHARED_DEMO_SESSION_ID=building-radar), and forgetting to set anything can only
# ever land you in the safe one.
SHARED_DEMO_SESSION_ID = os.environ.get("SHARED_DEMO_SESSION_ID", "")
