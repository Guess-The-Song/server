# Hints for the https configuration

## Certificate

If you use apache2, you can use the same key as your apache2 server.\
This is normally in the directory: `/etc/letsencrypt/live/yourdomain.com/` \
So:
> `key`: `/etc/letsencrypt/live/yourdomain.com/privkey.pem` \
> `cert`: `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`

But you need to make sure that the user that runs the server has access to the files.\
You can do this by adding the user to the group that owns the files and give the group read access.\
But know what you are doing, because you are giving the user access to the private key.\
And if you mess up you could give write access to the private key to everyone or worse.\
This is not a tutorial on how to do this, but you can find more information on the internet.\
We will not help you with this nor are we responsible for any damage that you do to your system.