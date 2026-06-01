# Use a lightweight nginx image to serve the static portfolio files
FROM nginx:stable-alpine

# Remove default nginx content and add our site files
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html/

# Expose the standard HTTP port
EXPOSE 80

# Run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
