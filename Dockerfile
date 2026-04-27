FROM nginx:alpine

# Serving built application
COPY dist/ /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]